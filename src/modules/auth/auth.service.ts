import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { $Enums } from '../../../generated/prisma/client.js';
import {
  getDeviceActivationTtlMinutes,
  getDeviceRefreshTtlDays,
  getDeviceSecretPepper,
} from '../../common/auth/device-auth.config';
import {
  generateActivationCode,
  generateDeviceSecret,
  hashDeviceSecret,
  normalizeDeviceCode,
  normalizeDeviceMacAddress,
} from '../../common/auth/device-auth.util';
import { AuthTokenPayload } from '../../common/auth/auth.types';
import { hashPassword, verifyPassword } from '../../common/auth/password.util';
import { TokenRevocationService } from '../../common/auth/token-revocation.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AuthLoginDto } from './dto/auth-login.dto';
import { DeviceActivationApproveDto } from './dto/device-activation-approve.dto';
import { DeviceActivationRequestDto } from './dto/device-activation-request.dto';
import { DeviceApiKeyRevokeDto } from './dto/device-api-key-revoke.dto';
import { DeviceLogoutDto } from './dto/device-logout.dto';
import { DeviceTokenExchangeDto } from './dto/device-token-exchange.dto';
import { DeviceTokenRefreshDto } from './dto/device-token-refresh.dto';
import { DeviceAuthCacheService } from './device-auth-cache.service';

type DeviceRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type PendingActivationsView = {
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
};

@Injectable()
export class AuthService {
  private readonly deviceSecretPepper = getDeviceSecretPepper();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly tokenRevocationService: TokenRevocationService,
    private readonly deviceAuthCache: DeviceAuthCacheService,
  ) {}

  private hashSecret(value: string): string {
    return hashDeviceSecret(value, this.deviceSecretPepper);
  }

  private parseDeviceApiKey(apiKey: string): { apiKeyId: string; apiKeySecret: string } {
    const value = apiKey.trim();
    const [keyIdPart, keySecret] = value.split('.', 2);
    const apiKeyId = keyIdPart.startsWith('dapi_')
      ? keyIdPart.slice(5)
      : keyIdPart;

    if (!apiKeyId || !keySecret) {
      throw new UnauthorizedException('Invalid device API key format');
    }

    return {
      apiKeyId,
      apiKeySecret: keySecret,
    };
  }

  private getRefreshTtlSeconds(): number {
    return getDeviceRefreshTtlDays() * 24 * 60 * 60;
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

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
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

  private async resolveOrCreateDeviceForActivation(
    tenantId: string,
    dto: DeviceActivationRequestDto,
  ) {
    const identifier = dto.identifier.trim();
    const macAddress = normalizeDeviceMacAddress(dto.macAddress);

    let device = macAddress
      ? await this.prisma.client.printDevice.findFirst({
          where: { tenantId, macAddress },
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
        where: { tenantId, identifier },
        select: {
          id: true,
          tenantId: true,
          identifier: true,
          code: true,
          status: true,
        },
      });
    }

    if (device) {
      return {
        device,
        identifier,
        macAddress,
      };
    }

    const baseCode = normalizeDeviceCode(dto.code?.trim() || identifier);
    const uniqueCode = `${baseCode || 'device'}-${randomUUID().slice(0, 8)}`;

    const created = await this.prisma.client.printDevice.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: uniqueCode,
        type: dto.type ?? $Enums.PrintDeviceType.other,
        connectionType: dto.connectionType ?? $Enums.PrintConnectionType.bridge,
        identifier,
        macAddress,
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

    return {
      device: created,
      identifier,
      macAddress,
    };
  }

  private async issueDeviceSession(
    params: {
      tenantId: string;
      tenantSlug: string;
      deviceId: string;
      apiKeyId: string;
    },
    meta?: DeviceRequestMeta,
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
    const refreshToken = generateDeviceSecret();
    const refreshTokenHash = this.hashSecret(refreshToken);
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    const refreshExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

    const session = await this.prisma.client.deviceSession.create({
      data: {
        tenantId: params.tenantId,
        deviceId: params.deviceId,
        apiKeyId: params.apiKeyId,
        refreshTokenHash,
        expiresAt: refreshExpiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
      select: {
        id: true,
      },
    });

    await this.deviceAuthCache.setRefreshSession(
      refreshTokenHash,
      session.id,
      refreshTtlSeconds,
    );

    await this.prisma.client.deviceApiKey.update({
      where: { id: params.apiKeyId },
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

  async registerInitialAdmin(dto: AdminRegisterDto, bootstrapToken?: string) {
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
    const adminSession = await this.tryAdminSession(
      dto.identifier.trim(),
      dto.password.trim(),
    );
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
    meta?: DeviceRequestMeta,
  ) {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();
    const identifier = dto.identifier.trim();
    const macAddress = normalizeDeviceMacAddress(dto.macAddress);

    await this.deviceAuthCache.enforceActivationRateLimit(
      tenantSlug,
      identifier,
      macAddress,
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

    const resolved = await this.resolveOrCreateDeviceForActivation(tenant.id, dto);
    const activationCode = generateActivationCode();
    const expiresAt = new Date(Date.now() + getDeviceActivationTtlMinutes() * 60 * 1000);

    await this.prisma.client.deviceActivationRequest.updateMany({
      where: {
        deviceId: resolved.device.id,
        status: $Enums.DeviceActivationStatus.pending,
      },
      data: {
        status: $Enums.DeviceActivationStatus.expired,
      },
    });

    const activation = await this.prisma.client.deviceActivationRequest.create({
      data: {
        tenantId: tenant.id,
        deviceId: resolved.device.id,
        activationCodeHash: this.hashSecret(activationCode),
        status: $Enums.DeviceActivationStatus.pending,
        requestedIdentifier: resolved.identifier,
        requestedMacAddress: resolved.macAddress,
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

    await this.deviceAuthCache.invalidatePendingActivations();

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
    const matchingActivations = await this.prisma.client.deviceActivationRequest.findMany({
      where: {
        activationCodeHash: this.hashSecret(dto.activationCode.trim()),
        status: $Enums.DeviceActivationStatus.pending,
        expiresAt: {
          gte: new Date(),
        },
      },
      take: 2,
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

    const activation = matchingActivations[0];

    if (matchingActivations.length > 1) {
      throw new ForbiddenException('Activation code is ambiguous');
    }

    if (!activation) {
      throw new NotFoundException('Activation code not found or expired');
    }

    const apiKeySecret = generateDeviceSecret();

    await this.prisma.client.deviceApiKey.updateMany({
      where: {
        deviceId: activation.device.id,
        status: $Enums.DeviceApiKeyStatus.active,
      },
      data: {
        status: $Enums.DeviceApiKeyStatus.revoked,
        revokedAt: new Date(),
        revokedReason: 'Superseded by a new approved activation',
      },
    });

    const apiKey = await this.prisma.client.deviceApiKey.create({
      data: {
        tenantId: activation.tenant.id,
        deviceId: activation.device.id,
        secretHash: this.hashSecret(apiKeySecret),
        status: $Enums.DeviceApiKeyStatus.active,
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

    await this.deviceAuthCache.invalidatePendingActivations();

    return {
      activationRequestId: activation.id,
      tenantId: activation.tenant.id,
      tenantSlug: activation.tenant.slug,
      device: activation.device,
      apiKey: {
        id: apiKey.id,
        status: apiKey.status,
        key: `dapi_${apiKey.id}.${apiKeySecret}`,
      },
    };
  }

  async exchangeDeviceToken(
    dto: DeviceTokenExchangeDto,
    meta?: DeviceRequestMeta,
  ) {
    const parsedApiKey = this.parseDeviceApiKey(dto.apiKey);

    const apiKey = await this.prisma.client.deviceApiKey.findFirst({
      where: {
        id: parsedApiKey.apiKeyId,
        status: $Enums.DeviceApiKeyStatus.active,
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

    if (!apiKey) {
      throw new UnauthorizedException('Invalid device API key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.deviceApiKey.update({
        where: { id: apiKey.id },
        data: { status: $Enums.DeviceApiKeyStatus.expired },
      });
      throw new UnauthorizedException('Device API key expired');
    }

    if (this.hashSecret(parsedApiKey.apiKeySecret) !== apiKey.secretHash) {
      throw new UnauthorizedException('Invalid device API key');
    }

    if (apiKey.tenant.status !== $Enums.RecordStatus.active) {
      throw new UnauthorizedException('Tenant not active');
    }

    return this.issueDeviceSession(
      {
        tenantId: apiKey.tenant.id,
        tenantSlug: apiKey.tenant.slug,
        deviceId: apiKey.device.id,
        apiKeyId: apiKey.id,
      },
      meta,
    );
  }

  async refreshDeviceToken(
    dto: DeviceTokenRefreshDto,
    meta?: DeviceRequestMeta,
  ) {
    const refreshHash = this.hashSecret(dto.refreshToken.trim());
    const cachedSessionId = await this.deviceAuthCache.getRefreshSessionId(refreshHash);

    const session = cachedSessionId
      ? await this.prisma.client.deviceSession.findUnique({
          where: { id: cachedSessionId },
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
          where: { refreshTokenHash: refreshHash },
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
        data: { revokedAt: new Date() },
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
    const rotatedRefreshToken = generateDeviceSecret();
    const rotatedRefreshHash = this.hashSecret(rotatedRefreshToken);
    const refreshTtlSeconds = this.getRefreshTtlSeconds();
    const refreshExpiresAt = new Date(Date.now() + refreshTtlSeconds * 1000);

    await this.prisma.client.deviceSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: rotatedRefreshHash,
        expiresAt: refreshExpiresAt,
        lastUsedAt: new Date(),
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    await this.deviceAuthCache.deleteRefreshSession(refreshHash);
    await this.deviceAuthCache.setRefreshSession(
      rotatedRefreshHash,
      session.id,
      refreshTtlSeconds,
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

    await this.deviceAuthCache.deleteRefreshSession(refreshHash);

    return {
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }

  async revokeDeviceApiKey(dto: DeviceApiKeyRevokeDto) {
    const apiKey = await this.prisma.client.deviceApiKey.findUnique({
      where: { id: dto.apiKeyId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.status === $Enums.DeviceApiKeyStatus.revoked) {
      return {
        apiKeyId: apiKey.id,
        revoked: false,
      };
    }

    await this.prisma.client.deviceApiKey.update({
      where: { id: apiKey.id },
      data: {
        status: $Enums.DeviceApiKeyStatus.revoked,
        revokedAt: new Date(),
        revokedReason: dto.reason?.trim() || 'Revoked by admin',
      },
    });

    const activeSessions = await this.prisma.client.deviceSession.findMany({
      where: {
        apiKeyId: apiKey.id,
        revokedAt: null,
      },
      select: {
        refreshTokenHash: true,
      },
    });

    await this.prisma.client.deviceSession.updateMany({
      where: {
        apiKeyId: apiKey.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.deviceAuthCache.deleteRefreshSessions(
      activeSessions.map((session) => session.refreshTokenHash),
    );

    return {
      apiKeyId: apiKey.id,
      revoked: true,
      revokedAt: new Date().toISOString(),
    };
  }

  async listPendingDeviceActivations(input?: {
    tenantSlug?: string;
    limit?: number;
  }): Promise<PendingActivationsView> {
    const tenantSlug = input?.tenantSlug?.trim().toLowerCase() || undefined;
    const normalizedLimit = Math.max(1, Math.min(100, Number(input?.limit ?? 50)));

    const cached = await this.deviceAuthCache.getPendingActivations<PendingActivationsView>(
      tenantSlug,
      normalizedLimit,
    );

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

    const result: PendingActivationsView = {
      items: pendingItems.map((item) => ({
        ...item,
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
      })),
      count: pendingItems.length,
    };

    await this.deviceAuthCache.setPendingActivations(
      tenantSlug,
      normalizedLimit,
      result,
      10,
    );

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