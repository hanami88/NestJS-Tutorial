import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { ArticlesController } from './articles.controller.js';
import { ArticleEntity } from './entities/article.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagEntity } from './entities/tag.entity.js';
import { UserEntity } from '../users/entities/user.entity.js';
import { ProfilesModule } from '../profiles/profiles.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArticleEntity, TagEntity, UserEntity]),
    ProfilesModule,
  ],
  providers: [ArticlesService],
  controllers: [ArticlesController],
})
export class ArticlesModule {}
