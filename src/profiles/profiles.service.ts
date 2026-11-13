import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity.js';
import { FollowEntity } from './entities/follow.entity.js';
import { AttachmentsService } from '../attachments/attachments.service.js';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followsRepository: Repository<FollowEntity>,
    private readonly attachmentsService: AttachmentsService,
  ) {}

  private async buildProfileResponse(
    targetUser: UserEntity,
    currentUserId?: number,
  ) {
    let following = false;
    if (currentUserId && currentUserId !== targetUser.id) {
      const followRecord = await this.followsRepository.findOne({
        where: {
          follower_id: currentUserId,
          following_id: targetUser.id,
        },
      });
      following = !!followRecord;
    }

    const avatar = await this.attachmentsService.findUserAvatar(targetUser.id);
    const imageUrl = avatar ? `/api/attachments/${avatar.id}` : null;

    return {
      profile: {
        username: targetUser.username,
        bio: targetUser.bio ?? null,
        image: imageUrl,
        following,
      },
    };
  }

  async getProfile(username: string, currentUserId?: number) {
    const targetUser = await this.usersRepository.findOne({
      where: { username },
    });
    if (!targetUser) {
      throw new NotFoundException('translation.user.not_found');
    }

    return this.buildProfileResponse(targetUser, currentUserId);
  }

  async followUser(username: string, currentUserId: number) {
    const targetUser = await this.usersRepository.findOne({
      where: { username },
    });
    if (!targetUser) {
      throw new NotFoundException('translation.user.not_found');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException('translation.profile.cannot_follow_self');
    }

    const existingFollow = await this.followsRepository.findOne({
      where: {
        follower_id: currentUserId,
        following_id: targetUser.id,
      },
    });

    if (!existingFollow) {
      const newFollow = this.followsRepository.create({
        follower_id: currentUserId,
        following_id: targetUser.id,
      });
      await this.followsRepository.save(newFollow);
    }

    return this.buildProfileResponse(targetUser, currentUserId);
  }

  async unfollowUser(username: string, currentUserId: number) {
    const targetUser = await this.usersRepository.findOne({
      where: { username },
    });
    if (!targetUser) {
      throw new NotFoundException('translation.user.not_found');
    }

    if (targetUser.id === currentUserId) {
      throw new BadRequestException('translation.profile.cannot_unfollow_self');
    }

    await this.followsRepository.delete({
      follower_id: currentUserId,
      following_id: targetUser.id,
    });

    return this.buildProfileResponse(targetUser, currentUserId);
  }
}
