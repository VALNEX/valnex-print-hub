import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterLoginDto } from './dto/printer-login.dto';
import { $Enums } from '../../../generated/prisma/client.js';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { AuthTokenPayload } from '../../common/auth/auth.types';
import { verifyApiKey } from '../../common/auth/api-key.util';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { hashPassword, verifyPassword } from '../../common/auth/password.util';
import { AuthLoginDto } from './dto/auth-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  private async issueTenantSession(tenant: { id: string; slug: string }) {
    const jti = randomUUID();
    const payload: AuthTokenPayload = {
      sub: tenant.id,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      scope: 'printer-client',
      jti,
    };

    const token = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;

    return {
      tokenType: 'Bearer',
      accessToken: token,
      expiresAt: decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : undefined,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      ws: {
        namespace: '/print',
        auth: {
          token,
        },
      },
    };
  }

  private async tryAdminSession(identifier: string, password: string) {
    const normalizedEmail = identifier.trim().toLowerCase();
    const admin = await this.prisma.client.adminUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        status: true,
      },
    });

    if (!admin || admin.status !== $Enums.RecordStatus.active) {
      return null;
    }

    const isValidPassword = await verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    await this.prisma.client.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueAdminSession({
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
    });
  }

  private async tryTenantSession(identifier: string, password: string) {
    const username = identifier.trim().toLowerCase();

    const tenant = await this.prisma.client.tenant.findFirst({
      where: {
        slug: username,
        status: $Enums.RecordStatus.active,
      },
      select: {
        id: true,
        slug: true,
        apiKey: true,
      },
    });

    if (!tenant?.apiKey) {
      return null;
    }

    const isValidApiKey = await verifyApiKey(password, tenant.apiKey);
    if (!isValidApiKey) {
      return null;
    }

    return this.issueTenantSession({
      id: tenant.id,
      slug: tenant.slug,
    });
  }

  private async issueAdminSession(admin: {
    id: string;
    email: string;
    fullName: string | null;
  }) {
    const jti = randomUUID();
    const payload: AuthTokenPayload = {
      sub: admin.id,
      tenantId: 'admin',
      tenantSlug: 'admin',
      scope: 'admin',
      adminEmail: admin.email,
      jti,
    };

    const token = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;

    return {
      tokenType: 'Bearer',
      accessToken: token,
      expiresAt: decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : undefined,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
      },
    };
  }

  async registerInitialAdmin(
    dto: AdminRegisterDto,
    bootstrapToken?: string,
  ) {
    const configuredBootstrapToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!configuredBootstrapToken) {
      throw new ForbiddenException(
        'Admin bootstrap disabled. Configure ADMIN_BOOTSTRAP_TOKEN',
      );
    }
    if (bootstrapToken !== configuredBootstrapToken) {
      throw new ForbiddenException('Invalid bootstrap token');
    }

    const existingAdmins = await this.prisma.client.adminUser.count();
    if (existingAdmins > 0) {
      throw new ForbiddenException('Admin bootstrap already completed');
    }

    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(dto.password.trim());

    const admin = await this.prisma.client.adminUser.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName?.trim() || null,
        status: $Enums.RecordStatus.active,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    return this.issueAdminSession(admin);
  }

  async adminLogin(dto: AdminLoginDto) {
    const session = await this.tryAdminSession(dto.email, dto.password.trim());
    if (!session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return session;
  }

  async printerLogin(dto: PrinterLoginDto) {
    const session = await this.tryTenantSession(dto.username, dto.password.trim());
    if (!session) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return session;
  }

  async login(dto: AuthLoginDto) {
    const identifier = dto.identifier.trim();
    const password = dto.password.trim();

    const adminSession = await this.tryAdminSession(identifier, password);
    if (adminSession) {
      return {
        principalType: 'admin' as const,
        ...adminSession,
      };
    }

    const tenantSession = await this.tryTenantSession(identifier, password);
    if (tenantSession) {
      return {
        principalType: 'tenant' as const,
        ...tenantSession,
      };
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  async logout(auth: AuthTokenPayload) {
    this.tokenRevocationService.revoke(auth.jti, auth.exp);
    return {
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }
}
