import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '../../../generated/prisma/client.js';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { AuthTokenPayload } from '../../common/auth/auth.types';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { hashPassword, verifyPassword } from '../../common/auth/password.util';
import { AuthLoginDto } from './dto/auth-login.dto';
import { DeviceActivationRequestDto } from './dto/device-activation-request.dto';
import { DeviceActivationApproveDto } from './dto/device-activation-approve.dto';
import { DeviceTokenExchangeDto } from './dto/device-token-exchange.dto';
import { DeviceTokenRefreshDto } from './dto/device-token-refresh.dto';
import { DeviceLogoutDto } from './dto/device-logout.dto';
import { DeviceCredentialRevokeDto } from './dto/device-credential-revoke.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
    private readonly redis: RedisService,
  ) {}

  private getActivationRateLimitWindowSeconds(): number {
    const value = Number(process.env.DEVICE_ACTIVATION_RATE_WINDOW_SECONDS ?? 600);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 600;
  }

  private getActivationRateLimitMaxAttempts(): number {
    const value = Number(process.env.DEVICE_ACTIVATION_RATE_MAX_ATTEMPTS ?? 10);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
  }

  private getRefreshTokenCacheKey(refreshTokenHash: string): string {
    return `auth:device:refresh:${refreshTokenHash}`;
  }

  private getPendingActivationsCacheKey(tenantSlug: string | undefined, limit: number): string {
    return `cache:auth:device:activation:pending:${tenantSlug || 'all'}:${limit}`;
  }

  private getActivationRateLimitKey(
    tenantSlug: string,
    identifier: string,
    macAddress: string | null,
    ipAddress?: string,
  ): string {
    const ipSegment = ipAddress?.trim() || 'unknown-ip';
    const macSegment = macAddress || 'unknown-mac';
    return `auth:device:activation:rl:${tenantSlug}:${identifier}:${macSegment}:${ipSegment}`;
  }

  private async enforceActivationRateLimit(
    tenantSlug: string,
    identifier: string,
    macAddress: string | null,
    ipAddress?: string,
  ): Promise<void> {
    const key = this.getActivationRateLimitKey(
      tenantSlug,
      identifier,
      macAddress,
      ipAddress,
    );
    const currentCount = await this.redis.incrementWithTtl(
      key,
      this.getActivationRateLimitWindowSeconds(),
    );

    if (currentCount <= 0) {
      return;
    }

    if (currentCount > this.getActivationRateLimitMaxAttempts()) {
      throw new ForbiddenException('Too many activation requests. Please retry later.');
    }
  }

  private getActivationTtlMinutes(): number {
    const value = Number(process.env.DEVICE_ACTIVATION_TTL_MINUTES ?? 10);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 10;
  }

  private getDeviceRefreshTtlDays(): number {
    const value = Number(process.env.DEVICE_REFRESH_TTL_DAYS ?? 30);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 30;
  }

  private hashSecret(value: string): string {
    const pepper = process.env.DEVICE_SECRET_PEPPER ?? '';
    return createHash('sha256')
      .update(`${value}::${pepper}`)
      .digest('hex');
  }

  private normalizeCode(source: string): string {
    return source
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  private normalizeMacAddress(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-f0-9]/g, '');

    if (normalized.length !== 12) {
      return null;
    }

    return normalized.match(/.{1,2}/g)?.join(':') ?? null;
  }

  private generateActivationCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(8);
    let code = '';
    for (let index = 0; index < 8; index += 1) {
      code += alphabet[bytes[index] % alphabet.length];
    }
    return code;
  }

  private generateDeviceSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  private async issueDeviceSession(
    params: {
      tenantId: string;
      tenantSlug: string;
      deviceId: string;
      credentialId: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const jti = randomUUID();
    const payload: AuthTokenPayload = {
      sub: params.deviceId,
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      deviceId: params.deviceId,
      scope: 'printer-client',
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const accessDecoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const refreshToken = randomBytes(48).toString('base64url');
    const refreshTtlDays = this.getDeviceRefreshTtlDays();
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.client.deviceSession.create({
      data: {
        tenantId: params.tenantId,
        deviceId: params.deviceId,
        credentialId: params.credentialId,
        refreshTokenHash: this.hashSecret(refreshToken),
        expiresAt: refreshExpiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
      select: {
        id: true,
      },
    });

    await this.redis.set(
      this.getRefreshTokenCacheKey(this.hashSecret(refreshToken)),
      session.id,
      refreshTtlDays * 24 * 60 * 60,
    );

    await this.prisma.client.deviceCredential.update({
      where: { id: params.credentialId },
      data: { lastUsedAt: new Date() },
    });

    return {
      tokenType: 'Bearer',
      accessToken,
      accessExpiresAt: accessDecoded?.exp
        ? new Date(accessDecoded.exp * 1000).toISOString()
        : undefined,
      refreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      tenantId: params.tenantId,
      tenantSlug: params.tenantSlug,
      deviceId: params.deviceId,
      ws: {
        namespace: '/print',
        auth: {
          token: accessToken,
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

    throw new UnauthorizedException('Invalid credentials');
  }

  async requestDeviceActivation(
    dto: DeviceActivationRequestDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();
    const identifier = dto.identifier.trim();
    const normalizedMacAddress = this.normalizeMacAddress(dto.macAddress);

    await this.enforceActivationRateLimit(
      tenantSlug,
      identifier,
      normalizedMacAddress,
      meta?.ipAddress,
    );

    const tenant = await this.prisma.client.tenant.findFirst({
      where: {
        slug: tenantSlug,
        status: $Enums.RecordStatus.active,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    let device = normalizedMacAddress
      ? await this.prisma.client.printDevice.findFirst({
          where: {
            tenantId: tenant.id,
            macAddress: normalizedMacAddress,
          },
          select: {
            id: true,
            tenantId: true,
            identifier: true,
            code: true,
            status: true,
          },
        })
      : null;

    if (!device) {
      device = await this.prisma.client.printDevice.findFirst({
        where: {
          tenantId: tenant.id,
          identifier,
        },
        select: {
          id: true,
          tenantId: true,
          identifier: true,
          code: true,
          status: true,
        },
      });
    }

    if (!device) {
      const baseCode = this.normalizeCode(dto.code?.trim() || identifier);
      const uniqueCode = `${baseCode || 'device'}-${randomUUID().slice(0, 8)}`;

      device = await this.prisma.client.printDevice.create({
        data: {
          tenantId: tenant.id,
          name: dto.name.trim(),
          code: uniqueCode,
          type: dto.type ?? $Enums.PrintDeviceType.other,
          connectionType: dto.connectionType ?? $Enums.PrintConnectionType.bridge,
          identifier,
          macAddress: normalizedMacAddress,
          status: $Enums.PrintDeviceStatus.unknown,
        },
        select: {
          id: true,
          tenantId: true,
          identifier: true,
          code: true,
          status: true,
        },
      });
    }

    const activationCode = this.generateActivationCode();
    const expiresAt = new Date(Date.now() + this.getActivationTtlMinutes() * 60 * 1000);

    await this.prisma.client.deviceActivationRequest.updateMany({
      where: {
        deviceId: device.id,
        status: $Enums.DeviceActivationStatus.pending,
      },
      data: {
        status: $Enums.DeviceActivationStatus.expired,
      },
    });

    const activation = await this.prisma.client.deviceActivationRequest.create({
      data: {
        tenantId: tenant.id,
        deviceId: device.id,
        activationCodeHash: this.hashSecret(activationCode),
        status: $Enums.DeviceActivationStatus.pending,
        requestedIdentifier: identifier,
        requestedMacAddress: normalizedMacAddress,
        requestedName: dto.name.trim(),
        requestedByIp: meta?.ipAddress,
        requestedByUserAgent: meta?.userAgent,
        expiresAt,
      },
      select: {
        id: true,
        tenantId: true,
        deviceId: true,
        status: true,
        expiresAt: true,
      },
    });

    await this.redis.delByPattern('cache:auth:device:activation:pending:*');

    return {
      activationRequestId: activation.id,
      activationCode,
      expiresAt: activation.expiresAt,
      tenantId: activation.tenantId,
      deviceId: activation.deviceId,
      status: activation.status,
    };
  }

  async approveDeviceActivation(
    dto: DeviceActivationApproveDto,
    adminAuth: AuthTokenPayload,
  ) {
    const activation = await this.prisma.client.deviceActivationRequest.findFirst({
      where: {
        id: dto.activationRequestId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
          },
        },
        device: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    });

    if (!activation) {
      throw new NotFoundException('Activation request not found');
    }

    if (activation.status !== $Enums.DeviceActivationStatus.pending) {
      throw new ForbiddenException('Activation request is no longer pending');
    }

    if (activation.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.deviceActivationRequest.update({
        where: { id: activation.id },
        data: { status: $Enums.DeviceActivationStatus.expired },
      });
      throw new ForbiddenException('Activation request expired');
    }

    if (activation.activationCodeHash !== this.hashSecret(dto.activationCode.trim())) {
      throw new ForbiddenException('Invalid activation code');
    }

    const deviceSecret = this.generateDeviceSecret();

    await this.prisma.client.deviceCredential.updateMany({
      where: {
        deviceId: activation.device.id,
        status: $Enums.DeviceCredentialStatus.active,
      },
      data: {
        status: $Enums.DeviceCredentialStatus.revoked,
        revokedAt: new Date(),
        revokedReason: 'Superseded by a new approved activation',
      },
    });

    const credential = await this.prisma.client.deviceCredential.create({
      data: {
        tenantId: activation.tenant.id,
        deviceId: activation.device.id,
        secretHash: this.hashSecret(deviceSecret),
        status: $Enums.DeviceCredentialStatus.active,
        issuedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
      },
    });

    await this.prisma.client.deviceActivationRequest.update({
      where: { id: activation.id },
      data: {
        status: $Enums.DeviceActivationStatus.approved,
        approvedByAdminId: adminAuth.sub,
        approvedAt: new Date(),
      },
    });

    await this.redis.delByPattern('cache:auth:device:activation:pending:*');

    return {
      activationRequestId: activation.id,
      tenantId: activation.tenant.id,
      tenantSlug: activation.tenant.slug,
      device: activation.device,
      credential: {
        id: credential.id,
        status: credential.status,
        secret: deviceSecret,
      },
    };
  }

  async exchangeDeviceToken(
    dto: DeviceTokenExchangeDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const credential = await this.prisma.client.deviceCredential.findFirst({
      where: {
        id: dto.credentialId,
        status: $Enums.DeviceCredentialStatus.active,
      },
      include: {
        tenant: {
          select: {
            id: true,
            slug: true,
            status: true,
          },
        },
        device: {
          select: {
            id: true,
            tenantId: true,
          },
        },
      },
    });

    if (!credential) {
      throw new UnauthorizedException('Invalid device credential');
    }

    if (credential.expiresAt && credential.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.deviceCredential.update({
        where: { id: credential.id },
        data: {
          status: $Enums.DeviceCredentialStatus.expired,
        },
      });
      throw new UnauthorizedException('Device credential expired');
    }

    const incomingSecretHash = this.hashSecret(dto.credentialSecret.trim());
    if (incomingSecretHash !== credential.secretHash) {
      throw new UnauthorizedException('Invalid device credential');
    }

    if (credential.tenant.status !== $Enums.RecordStatus.active) {
      throw new UnauthorizedException('Tenant not active');
    }

    return this.issueDeviceSession(
      {
        tenantId: credential.tenant.id,
        tenantSlug: credential.tenant.slug,
        deviceId: credential.device.id,
        credentialId: credential.id,
      },
      meta,
    );
  }

  async refreshDeviceToken(
    dto: DeviceTokenRefreshDto,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const refreshHash = this.hashSecret(dto.refreshToken.trim());
    const cachedSessionId = await this.redis.get(
      this.getRefreshTokenCacheKey(refreshHash),
    );

    const session = cachedSessionId
      ? await this.prisma.client.deviceSession.findUnique({
          where: {
            id: cachedSessionId,
          },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
                status: true,
              },
            },
          },
        })
      : await this.prisma.client.deviceSession.findUnique({
          where: {
            refreshTokenHash: refreshHash,
          },
          include: {
            tenant: {
              select: {
                id: true,
                slug: true,
                status: true,
              },
            },
          },
        });

    if (!session || session.revokedAt || session.refreshTokenHash !== refreshHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.deviceSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    if (session.tenant.status !== $Enums.RecordStatus.active) {
      throw new UnauthorizedException('Tenant not active');
    }

    const jti = randomUUID();
    const payload: AuthTokenPayload = {
      sub: session.deviceId,
      tenantId: session.tenantId,
      tenantSlug: session.tenant.slug,
      deviceId: session.deviceId,
      scope: 'printer-client',
      jti,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp?: number } | null;
    const rotatedRefreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + this.getDeviceRefreshTtlDays() * 24 * 60 * 60 * 1000,
    );

    await this.prisma.client.deviceSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: this.hashSecret(rotatedRefreshToken),
        expiresAt: refreshExpiresAt,
        lastUsedAt: new Date(),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    await this.redis.del(this.getRefreshTokenCacheKey(refreshHash));
    await this.redis.set(
      this.getRefreshTokenCacheKey(this.hashSecret(rotatedRefreshToken)),
      session.id,
      this.getDeviceRefreshTtlDays() * 24 * 60 * 60,
    );

    return {
      tokenType: 'Bearer',
      accessToken,
      accessExpiresAt: decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : undefined,
      refreshToken: rotatedRefreshToken,
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      tenantId: session.tenantId,
      tenantSlug: session.tenant.slug,
      deviceId: session.deviceId,
      ws: {
        namespace: '/print',
        auth: {
          token: accessToken,
        },
      },
    };
  }

  async logoutDevice(dto: DeviceLogoutDto) {
    const refreshHash = this.hashSecret(dto.refreshToken.trim());
    const session = await this.prisma.client.deviceSession.findUnique({
      where: { refreshTokenHash: refreshHash },
      select: { id: true, revokedAt: true },
    });

    if (!session || session.revokedAt) {
      return {
        revoked: false,
        revokedAt: new Date().toISOString(),
      };
    }

    await this.prisma.client.deviceSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.redis.del(this.getRefreshTokenCacheKey(refreshHash));

    return {
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }

  async revokeDeviceCredential(dto: DeviceCredentialRevokeDto) {
    const credential = await this.prisma.client.deviceCredential.findUnique({
      where: { id: dto.credentialId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    if (credential.status === $Enums.DeviceCredentialStatus.revoked) {
      return {
        credentialId: credential.id,
        revoked: false,
      };
    }

    await this.prisma.client.deviceCredential.update({
      where: { id: credential.id },
      data: {
        status: $Enums.DeviceCredentialStatus.revoked,
        revokedAt: new Date(),
        revokedReason: dto.reason?.trim() || 'Revoked by admin',
      },
    });

    const activeSessions = await this.prisma.client.deviceSession.findMany({
      where: {
        credentialId: credential.id,
        revokedAt: null,
      },
      select: {
        refreshTokenHash: true,
      },
    });

    await this.prisma.client.deviceSession.updateMany({
      where: {
        credentialId: credential.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (activeSessions.length > 0) {
      await Promise.all(
        activeSessions.map((session) =>
          this.redis.del(this.getRefreshTokenCacheKey(session.refreshTokenHash)),
        ),
      );
    }

    return {
      credentialId: credential.id,
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }

  async listPendingDeviceActivations(input?: {
    tenantSlug?: string;
    limit?: number;
  }) {
    const tenantSlug = input?.tenantSlug?.trim().toLowerCase() || undefined;
    const normalizedLimit = Math.max(1, Math.min(100, Number(input?.limit ?? 50)));
    const cacheKey = this.getPendingActivationsCacheKey(tenantSlug, normalizedLimit);

    const cached = await this.redis.getJson<{
      items: Array<{
        id: string;
        status: $Enums.DeviceActivationStatus;
        expiresAt: string;
        createdAt: string;
        requestedIdentifier: string;
        requestedMacAddress: string | null;
        requestedName: string | null;
        tenant: {
          id: string;
          slug: string;
          name: string;
        };
        device: {
          id: string;
          code: string;
          name: string;
          status: $Enums.PrintDeviceStatus;
        };
      }>;
      count: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const pendingItems = await this.prisma.client.deviceActivationRequest.findMany({
      where: {
        status: $Enums.DeviceActivationStatus.pending,
        expiresAt: {
          gte: new Date(),
        },
        ...(tenantSlug
          ? {
              tenant: {
                slug: tenantSlug,
              },
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        requestedIdentifier: true,
        requestedMacAddress: true,
        requestedName: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        device: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: normalizedLimit,
    });

    const result = {
      items: pendingItems.map((item) => ({
        ...item,
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      count: pendingItems.length,
    };

    await this.redis.setJson(cacheKey, result, 10);
    return result;
  }

  async logout(auth: AuthTokenPayload) {
    this.tokenRevocationService.revoke(auth.jti, auth.exp);
    return {
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }
}
