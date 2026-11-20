import {
  Controller,
  Post,
  UseGuards,
  Body,
  Req,
  Get,
  Param,
  Query,
  Delete,
  HttpStatus,
  HttpCode,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDataDto } from './dto/article.dto.js';
import {
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';
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
  async listArticle(
    @Query()
    query: any,
    @Req() req: any,
  ): Promise<MultipleArticlesResponseDto> {
    return this.articlesService.listArticles(query, req?.user.id);
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

  @Put(':slug')
  @UseGuards(JwtAuthGuard)
  async updateArticle(
    @Param('slug') slug: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @Req() req: any,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.updateArticle(
      slug,
      updateArticleDto.article,
      req.user.id,
    );
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT) // Trả về 204 No Content (hoặc bỏ dòng này nếu muốn trả 200 OK)
  async deleteArticle(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<void> {
    return this.articlesService.deleteArticle(slug, req.user.id);
  }

  @Post(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async favoriteArticle(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.favoriteArticle(slug, req.user.id);
  }

  @Delete(':slug/favorite')
  @UseGuards(JwtAuthGuard)
  async unfavoriteArticle(
    @Param('slug') slug: string,
    @Req() req: any,
  ): Promise<SingleArticleResponseDto> {
    return this.articlesService.unfavoriteArticle(slug, req.user.id);
  }
}
