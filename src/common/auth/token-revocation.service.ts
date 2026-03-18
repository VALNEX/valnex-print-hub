import { Injectable } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';

@Injectable()
export class TokenRevocationService {
  private readonly revokedByJti = new Map<string, number>();

  constructor(private readonly redis: RedisService) {}

  private getKey(jti: string): string {
    return `auth:revoked:jti:${jti}`;
  }

  revoke(jti: string, exp?: number): void {
    const expiry = typeof exp === 'number' ? exp : Math.floor(Date.now() / 1000) + 3600;
    this.revokedByJti.set(jti, expiry);
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.max(1, expiry - now);
    void this.redis.set(this.getKey(jti), String(expiry), ttlSeconds);
    this.cleanup();
  }

  isRevoked(jti?: string): boolean {
    if (!jti) {
      return false;
    }
    this.cleanup();
    return this.revokedByJti.has(jti);
  }

  async isRevokedAsync(jti?: string): Promise<boolean> {
    if (!jti) {
      return false;
    }

    this.cleanup();
    if (this.revokedByJti.has(jti)) {
      return true;
    }

    const cached = await this.redis.get(this.getKey(jti));
    if (!cached) {
      return false;
    }

    const expiry = Number(cached);
    if (Number.isFinite(expiry)) {
      this.revokedByJti.set(jti, expiry);
    }

    return true;
  }

  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.revokedByJti.entries()) {
      if (exp <= now) {
        this.revokedByJti.delete(jti);
      }
    }
  }
}
