import { Module } from '@nestjs/common';
import { RedisService } from './redis.service.js';

@Module({
  providers: [RedisService],
  exports: [RedisService], // Bắt buộc export
})
export class RedisModule {}
