import {
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
  Body,
  Headers,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import { UserEntity } from './entities/user.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterOptions } from '../common/config/multer.config.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('api/user')
export class UsersController {
  constructor(
    private usersService: UsersService,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}
  // API Lấy thông tin bản thân (Current User)
  @Get()
  @UseGuards(JwtAuthGuard) // Chỉ người có Token chưa bị khóa mới lọt qua được
  async getCurrentUser(
    @Body() userDto: any,
    @Headers('authorization') tokenDto: string,
  ) {
    // req.user được sinh ra từ JwtStrategy
    const email = userDto.email;
    const token = tokenDto.split(' ')[1];
    const user = await this.usersService.findByEmail(email);
    return {
      user: {
        email: user?.email,
        token: token,
        username: user?.username,
        bio: user?.bio,
        image: user?.image,
      },
    };
  }
  @Put()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  async updateUser(
    @CurrentUser('sub') userId: number, // Sửa thành 'id' nếu JWT payload của bạn dùng id
    @Headers('authorization') authHeader: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const token = authHeader?.split(' ')[1] || '';
    return this.usersService.updateUser(userId, updateUserDto, token, file);
  }

  //   @Get('profiles/:username')
  //   @UseGuards(JwtAuthGuard)
  //   async getProfile() {}

  //   @Post()
  //   @UseGuards(JwtAuthGuard)
  //   async followUser() {}

  //   @Put()
  //   @UseGuards(JwtAuthGuard)
  //   async unFollowUser() {}
}
