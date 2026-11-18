import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ArticlesService } from './articles.service.js';

@Controller('/api/articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  async createArticle(@Body('article') article: any) {
    this.articlesService.createArticle(article);
  }
}
