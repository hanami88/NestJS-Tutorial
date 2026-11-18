import { Controller, Post, UseGuards, Body, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDataDto } from './dto/article.dto.js';

@Controller('/api/articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  async createArticle(
    @Req() req: any,
    @Body('article') article: CreateArticleDataDto,
  ) {
    return this.articlesService.createArticle(req.user.id, article);
  }
}
