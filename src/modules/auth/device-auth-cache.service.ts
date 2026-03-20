import { ForbiddenException, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import {
  getDeviceActivationRateMaxAttempts,
  getDeviceActivationRateWindowSeconds,
} from '../../common/auth/device-auth.config';

@Injectable()
export class DeviceAuthCacheService {
  constructor(private readonly redis: RedisService) {}

  private getRefreshTokenCacheKey(refreshTokenHash: string): string {
    return `auth:device:refresh:${refreshTokenHash}`;
  }

  private getPendingActivationsCacheKey(
    tenantSlug: string | undefined,
    limit: number,
  ): string {
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

  async enforceActivationRateLimit(
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
      getDeviceActivationRateWindowSeconds(),
    );

    if (currentCount <= 0) {
      return;
    }

    if (currentCount > getDeviceActivationRateMaxAttempts()) {
      throw new ForbiddenException('Too many activation requests. Please retry later.');
    }
  }

  async setRefreshSession(
    refreshTokenHash: string,
    sessionId: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      this.getRefreshTokenCacheKey(refreshTokenHash),
      sessionId,
      ttlSeconds,
    );
  }

  async getRefreshSessionId(refreshTokenHash: string): Promise<string | null> {
    return this.redis.get(this.getRefreshTokenCacheKey(refreshTokenHash));
  }

  async deleteRefreshSession(refreshTokenHash: string): Promise<void> {
    await this.redis.del(this.getRefreshTokenCacheKey(refreshTokenHash));
  }

  async deleteRefreshSessions(refreshTokenHashes: string[]): Promise<void> {
    if (refreshTokenHashes.length === 0) {
      return;
    }

    await Promise.all(
      refreshTokenHashes.map((hash) => this.deleteRefreshSession(hash)),
    );
  }

  async getPendingActivations<T>(
    tenantSlug: string | undefined,
    limit: number,
  ): Promise<T | null> {
    return this.redis.getJson<T>(
      this.getPendingActivationsCacheKey(tenantSlug, limit),
    );
  }

  async setPendingActivations(
    tenantSlug: string | undefined,
    limit: number,
    payload: unknown,
    ttlSeconds = 10,
  ): Promise<void> {
    await this.redis.setJson(
      this.getPendingActivationsCacheKey(tenantSlug, limit),
      payload,
      ttlSeconds,
    );
  }

  async invalidatePendingActivations(): Promise<void> {
    await this.redis.delByPattern('cache:auth:device:activation:pending:*');
  }
}
