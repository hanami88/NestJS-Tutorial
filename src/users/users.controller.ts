import {
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
  Body,
  Headers,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { avatarMulterOptions } from '../common/config/multer.config.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('api/user')
export class UsersController {
  constructor(private usersService: UsersService) {}
  // API Lấy thông tin bản thân (Current User)
  @Get()
  @UseGuards(JwtAuthGuard) // Chỉ người có Token chưa bị khóa mới lọt qua được
  async getCurrentUser(
    @Req() req: any,
    @Headers('authorization') tokenDto: string,
  ) {
    const email = req.user.email;
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
