import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrinterLoginDto } from './dto/printer-login.dto';
import { $Enums } from '../../../generated/prisma/client.js';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { AuthTokenPayload } from '../../common/auth/auth.types';
import { verifyApiKey } from '../../common/auth/api-key.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async printerLogin(dto: PrinterLoginDto) {
    const username = dto.username.trim();
    const password = dto.password.trim();

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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidApiKey = await verifyApiKey(password, tenant.apiKey);
    if (!isValidApiKey) {
      throw new UnauthorizedException('Invalid credentials');
    }

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

  async logout(auth: AuthTokenPayload) {
    this.tokenRevocationService.revoke(auth.jti, auth.exp);
    return {
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }
}
