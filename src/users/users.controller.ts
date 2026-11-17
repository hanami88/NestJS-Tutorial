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
  @UseInterceptors(FileInterceptor('image', avatarMulterOptions))
  async updateUser(
    @Req() req: any,
    @Headers('authorization') authHeader: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const token = authHeader?.split(' ')[1] || '';
    return this.usersService.updateUser(
      req.user.id,
      updateUserDto,
      token,
      file,
    );
  }
}
