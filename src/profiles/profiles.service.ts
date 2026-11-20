import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

    const image = await this.attachmentsService.findUserImage(targetUser.id);
    const imageUrl = image ? `/api/attachments/${image.id}` : null;

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
  async getProfilesByUsers(
    users: UserEntity[],
    currentUserId?: number,
  ): Promise<
    Map<
      number,
      {
        username: string;
        bio: string | null;
        image: string | null;
        following: boolean;
      }
    >
  > {
    const profilesMap = new Map<
      number,
      {
        username: string;
        bio: string | null;
        image: string | null;
        following: boolean;
      }
    >();

    if (users.length === 0) {
      return profilesMap;
    }

    // 1. Lọc trùng tác giả theo id
    const uniqueUsersMap = new Map<number, UserEntity>();
    for (const user of users) {
      if (!uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    }
    const uniqueAuthorIds = Array.from(uniqueUsersMap.keys());

    // 2. Chạy song song 2 query duy nhất: 1 query follows (nếu đã login) + 1 query attachments
    const [follows, attachments] = await Promise.all([
      currentUserId
        ? this.followsRepository.find({
            where: {
              follower_id: currentUserId,
              following_id: In(uniqueAuthorIds),
            },
            select: {
              following_id: true,
            }, // Chỉ lấy cột cần thiết
          })
        : Promise.resolve([]),
      this.attachmentsService.findUserImages(uniqueAuthorIds),
    ]);

    // 3. Đưa kết quả vào Set/Map để tra cứu O(1)
    const followingIdSet = new Set(follows.map((f) => f.following_id));
    const imageMap = new Map(
      attachments.map((att) => [
        att.attachable_id,
        `/api/attachments/${att.id}`,
      ]),
    );

    // 4. Build map kết quả theo user.id
    for (const [userId, user] of uniqueUsersMap.entries()) {
      profilesMap.set(userId, {
        username: user.username,
        bio: user.bio ?? null,
        image: imageMap.get(userId) ?? null,
        following: currentUserId ? followingIdSet.has(userId) : false,
      });
    }

    return profilesMap;
  }
}
