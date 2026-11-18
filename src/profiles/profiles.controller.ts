import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ProfilesService } from './profiles.service.js';

@Controller('api/profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':username')
  async getProfile(@Param('username') username: string) {
    console.log(username);
    return this.profilesService.getProfile(username);
  }

  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  async followUser(@Param('username') username: string, @Req() req: any) {
    return this.profilesService.followUser(username, req.user.id);
  }

  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  async unfollowUser(@Param('username') username: string, @Req() req: any) {
    return this.profilesService.unfollowUser(username, req.user.id);
  }
}
