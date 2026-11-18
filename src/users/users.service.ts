import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AttachmentsService } from '../attachments/attachments.service.js';
import { AttachmentEntity } from '../attachments/entities/attachment.entity.js';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly attachmentsService: AttachmentsService,
    private readonly dataSource: DataSource,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase();
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = this.usersRepository.create({
      ...createUserDto,
      email,
      password: hashedPassword,
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error: any) {
      const err = error as any;
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        throw new ConflictException(
          'translation.auth.email_or_username_exists',
        );
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
  async updateUser(
    userId: number,
    updateUserDto: UpdateUserDto,
    token: string,
    file?: Express.Multer.File,
  ) {
    let oldFileToDelete: string | null = null;
    let newFileRelativePath: string | null = null;

    try {
      // BƯỚC 1: Thực hiện toàn bộ thao tác DB trong 1 Transaction
      const result = await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(UserEntity, {
          where: { id: userId },
        });
        if (!user) {
          throw new NotFoundException('translation.user.not_found');
        }

        if (updateUserDto.email && updateUserDto.email !== user.email) {
          const emailExists = await manager.findOne(UserEntity, {
            where: { email: updateUserDto.email },
          });
          if (emailExists) {
            throw new ConflictException('translation.auth.email_exists');
          }
          user.email = updateUserDto.email;
        }
        if (
          updateUserDto.username &&
          updateUserDto.username !== user.username
        ) {
          const usernameExists = await manager.findOne(UserEntity, {
            where: { username: updateUserDto.username },
          });
          if (usernameExists) {
            throw new ConflictException('translation.auth.username_exists');
          }
          user.username = updateUserDto.username;
        }

        if (updateUserDto.bio !== undefined) {
          user.bio = updateUserDto.bio;
        }

        if (updateUserDto.password) {
          user.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        const savedUser = await manager.save(user);

        let imageUrl: string | null = null;
        if (file) {
          const { attachment, oldFileUrl } =
            await this.attachmentsService.replaceUserImage(
              manager,
              user.id,
              file,
            );
          oldFileToDelete = oldFileUrl;
          newFileRelativePath = attachment.url;
          imageUrl = `/api/attachments/${attachment.id}`;
        } else {
          const currentImage = await manager.findOne(AttachmentEntity, {
            where: { attachable_type: 'User', attachable_id: user.id },
          });
          imageUrl = currentImage
            ? `/api/attachments/${currentImage.id}`
            : null;
        }

        return { savedUser, imageUrl };
      });

      // BƯỚC 2: DB đã commit thành công -> Ghi file mới từ RAM xuống ổ đĩa và xóa file cũ
      if (file && newFileRelativePath) {
        await this.attachmentsService.writeBufferToDisk(
          newFileRelativePath,
          file.buffer,
        );
        await this.attachmentsService.deleteFileIfExists(oldFileToDelete);
      }

      return {
        user: {
          email: result.savedUser.email,
          token,
          username: result.savedUser.username,
          bio: result.savedUser.bio ?? null,
          image: result.imageUrl,
        },
      };
    } catch (error: any) {
      // Bắt lỗi trùng lặp ở mức Database (nếu 2 request đua nhau cùng lúc)
      if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
        throw new ConflictException(
          'translation.auth.email_or_username_exists',
        );
      }
      throw error;
    }
  }
}
