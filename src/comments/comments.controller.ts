import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CreateCommentDataDto } from './dto/comment.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/jwt-authOptional.guard.js';
@Controller('api/articles')
export class CommentsController {
  constructor(private commentService: CommentsService) {}

  @Post(':slug/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Body() commentDto: CreateCommentDataDto,
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    return this.commentService.addComment(commentDto, slug, req.user.id);
  }

  @Get(':slug/comments')
  @UseGuards(OptionalJwtAuthGuard)
  async getComment(@Param('slug') slug: string, @Req() req: any) {
    return this.commentService.getComment(slug, req.user?.id);
  }
}
