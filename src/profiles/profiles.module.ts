import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity.js';
import { FollowEntity } from './entities/follow.entity.js';
import { AttachmentsModule } from '../attachments/attachments.module.js';
import { ProfilesService } from './profiles.service.js';
import { ProfilesController } from './profiles.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, FollowEntity]),
    AttachmentsModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
