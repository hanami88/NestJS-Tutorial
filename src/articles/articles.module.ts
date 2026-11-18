import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { ArticlesController } from './articles.controller.js';

@Module({
  providers: [ArticlesService],
  controllers: [ArticlesController]
})
export class ArticlesModule {}
