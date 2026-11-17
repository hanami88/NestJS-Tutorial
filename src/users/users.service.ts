import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AttachmentsService } from '../attachments/attachments.service.js';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    private readonly attachmentsService: AttachmentsService,
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
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('translation.user.not_found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new ConflictException('translation.auth.email_exists');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const usernameExists = await this.usersRepository.findOne({
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

    let imageUrl: string | null = null;
    if (file) {
      const attachment = await this.attachmentsService.replaceUserImage(
        user.id,
        file,
      );
      imageUrl = `/api/attachments/${attachment.id}`;
    } else {
      const currentImage = await this.attachmentsService.findUserImage(user.id);
      imageUrl = currentImage ? `/api/attachments/${currentImage.id}` : null;
    }

    const savedUser = await this.usersRepository.save(user);

    return {
      user: {
        email: savedUser.email,
        token,
        username: savedUser.username,
        bio: savedUser.bio ?? null,
        image: imageUrl,
      },
    };
  }
}
