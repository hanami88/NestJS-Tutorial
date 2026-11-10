import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly redisClient: Redis;

  constructor() {
    // Kết nối tới Redis server bạn vừa bật bằng brew
    this.redisClient = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  // Lưu token vào sổ đen với thời gian tự hủy tính bằng giây
  async addToBlacklist(token: string, timeRemainingSeconds: number) {
    if (timeRemainingSeconds > 0) {
      await this.redisClient.set(
        token,
        'blacklisted',
        'EX',
        timeRemainingSeconds,
      );
    }
  }

  // Kiểm tra token có nằm trong sổ đen không
  async isBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisClient.get(token);
    return result === 'blacklisted';
  }

  // Ngắt kết nối khi tắt server
  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
