import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDataDto } from './dto/article.dto.js';
import {
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
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

  @Get()
  @UseGuards(JwtAuthGuard)
  async listArticle(
    @Query()
    query: any,
    @Req() req: any,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.listArticles(query, req.user.id);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  async feedArticle(
    @Req() req: any,
    @Query() query: any,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.feedArticle(query, req.user.id);
  }

  @Get(':slug')
  @UseGuards(JwtAuthGuard)
  async getArticle(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.getArticle(slug, req.user.id);
  }
}
