import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentEntity } from './entities/comment.entity.js';
import { ArticleEntity } from '../articles/entities/article.entity.js';
import { ProfilesModule } from '../profiles/profiles.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentEntity, ArticleEntity]),
    ProfilesModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
