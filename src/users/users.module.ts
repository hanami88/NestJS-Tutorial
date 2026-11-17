import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    AttachmentsModule,
    RedisModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
