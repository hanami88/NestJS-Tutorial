import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentEntity } from './entities/comment.entity.js';
import { ArticleEntity } from '../articles/entities/article.entity.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import { CreateCommentDataDto } from './dto/comment.dto.js';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    private readonly profilesService: ProfilesService,
  ) {}

  async addComment(
    commentDto: CreateCommentDataDto,
    slug: string,
    currentUserId: number,
  ) {
    // 1. Kiểm tra bài viết tồn tại theo slug
    const article = await this.articleRepository.findOne({
      where: { slug },
      select: { id: true },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // 2. Tạo và lưu comment mới
    const newComment = this.commentRepository.create({
      body: commentDto.comment.body,
      articleId: article.id,
      authorId: currentUserId,
    });
    const savedComment = await this.commentRepository.save(newComment);

    // 3. Tải lại comment kèm relation author để format response
    const createdComment = await this.commentRepository.findOneOrFail({
      where: { id: savedComment.id },
      relations: {
        author: true,
      },
    });

    const [formattedComment] = await this.formatCommentsList([createdComment]);

    return {
      comment: formattedComment,
    };
  }
  async getComment(slug: string, currentUserId?: number) {
    const article = await this.articleRepository.findOne({
      where: { slug },
      select: { id: true },
    });
    // 1. Kiểm tra bài viết tồn tại theo slug
    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }
    const comments = await this.commentRepository.find({
      where: { articleId: article.id },
      relations: { author: true },
    });
    const formattedComment = await this.formatCommentsList(
      comments,
      currentUserId,
    );

    return {
      comments: formattedComment,
    };
  }

  private async formatCommentsList(
    comments: CommentEntity[],
    currentUserId?: number,
  ) {
    if (comments.length === 0) {
      return [];
    }

    const authors = comments.map((comment) => comment.author);
    const profilesMap = await this.profilesService.getProfilesByUsers(
      authors,
      currentUserId,
    );

    return comments.map((comment) => ({
      id: comment.id,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      body: comment.body,
      author: profilesMap.get(comment.author.id)!,
    }));
  }
}
