import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    const redisHost = process.env.REDIS_HOST?.trim() || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT ?? 6379);
    const redisPassword = process.env.REDIS_PASSWORD?.trim() || undefined;

    try {
      this.client = redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
          })
        : new Redis({
            host: redisHost,
            port: Number.isFinite(redisPort) ? redisPort : 6379,
            password: redisPassword,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableReadyCheck: true,
          });

      this.client.on('error', (error) => {
        this.logger.warn(`Redis error: ${error.message}`);
      });
    } catch (error) {
      this.logger.warn(
        `Redis client disabled: ${error instanceof Error ? error.message : 'unknown_error'}`,
      );
      this.client = null;
    }
  }

  private async ensureConnected(): Promise<Redis | null> {
    if (!this.client) {
      return null;
    }

    if (this.client.status === 'ready') {
      return this.client;
    }

    try {
      await this.client.connect();
      return this.client;
    } catch (error) {
      this.logger.warn(
        `Redis unavailable: ${error instanceof Error ? error.message : 'unknown_error'}`,
      );
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    const client = await this.ensureConnected();
    if (!client) {
      return null;
    }

    return client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = await this.ensureConnected();
    if (!client) {
      return;
    }

    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, 'EX', Math.floor(ttlSeconds));
      return;
    }

    await client.set(key, value);
  }

  async del(key: string): Promise<void> {
    const client = await this.ensureConnected();
    if (!client) {
      return;
    }

    await client.del(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async delByPattern(pattern: string): Promise<number> {
    const client = await this.ensureConnected();
    if (!client) {
      return 0;
    }

    let cursor = '0';
    let totalDeleted = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        totalDeleted += await client.del(...keys);
      }
    } while (cursor !== '0');

    return totalDeleted;
  }

  async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const client = await this.ensureConnected();
    if (!client) {
      return 0;
    }

    const ttl = Math.max(1, Math.floor(ttlSeconds));
    const transaction = client.multi();
    transaction.incr(key);
    transaction.expire(key, ttl, 'NX');
    const result = await transaction.exec();

    if (!result || !result[0] || result[0][0]) {
      return 0;
    }

    const count = result[0][1] as number;
    return Number.isFinite(count) ? count : 0;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
