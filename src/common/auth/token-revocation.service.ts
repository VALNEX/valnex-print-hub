import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenRevocationService {
  private readonly revokedByJti = new Map<string, number>();

  revoke(jti: string, exp?: number): void {
    const expiry = typeof exp === 'number' ? exp : Math.floor(Date.now() / 1000) + 3600;
    this.revokedByJti.set(jti, expiry);
    this.cleanup();
  }

  isRevoked(jti?: string): boolean {
    if (!jti) {
      return false;
    }
    this.cleanup();
    return this.revokedByJti.has(jti);
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
