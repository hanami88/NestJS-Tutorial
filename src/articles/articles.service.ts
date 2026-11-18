import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import slugify from 'slugify';
import { randomBytes } from 'crypto';
import { ArticleEntity } from './entities/article.entity.js';
import { TagEntity } from './entities/tag.entity.js';
import { CreateArticleDataDto } from './dto/article.dto.js';
import { SingleArticleResponseDto } from './dto/article-response.dto.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import { UserEntity } from '../users/entities/user.entity.js';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(TagEntity)
    private readonly tagRepository: Repository<TagEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly profilesService: ProfilesService,
  ) {}

  async createArticle(
    authorId: number,
    dto: CreateArticleDataDto,
  ): Promise<SingleArticleResponseDto> {
    // 1. Tạo slug duy nhất từ title
    const slug = this.generateSlug(dto.title);

    // 2. Xử lý danh sách tags (tìm tag đã có + tạo tag chưa có)
    const tags = await this.resolveTags(dto.tagList);

    // 3. Khởi tạo và lưu bài viết vào DB
    const newArticle = this.articleRepository.create({
      slug,
      title: dto.title,
      description: dto.description,
      body: dto.body,
      authorId,
      tags,
    });

    const savedArticle = await this.articleRepository.save(newArticle);

    // 4. Lấy thông tin author profile để trả về đúng định dạng SingleArticleResponseDto
    const authorUser = await this.userRepository.findOneOrFail({
      where: { id: authorId },
    });
    const { profile } = await this.profilesService.getProfile(
      authorUser.username,
    );
    return {
      article: {
        slug: savedArticle.slug,
        title: savedArticle.title,
        description: savedArticle.description,
        body: savedArticle.body,
        tagList: savedArticle.tags
          ? savedArticle.tags.map((t) => t.name).sort()
          : [],
        createdAt: savedArticle.createdAt,
        updatedAt: savedArticle.updatedAt,
        favorited: false,
        favoritesCount: 0,
        author: {
          username: profile.username,
          bio: profile.bio ?? null,
          image: profile.image ?? null,
          following: profile.following,
        },
      },
    };
  }

  private generateSlug(title: string): string {
    const baseSlug = slugify(title, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    const suffix = randomBytes(3).toString('hex');
    return `${baseSlug}-${suffix}`;
  }

  private async resolveTags(tagList?: string[]): Promise<TagEntity[]> {
    if (!tagList || tagList.length === 0) {
      return [];
    }

    // Lọc khoảng trắng và loại bỏ tag trùng lặp trong request
    const uniqueNames = Array.from(
      new Set(tagList.map((t) => t.trim()).filter(Boolean)),
    );
    if (uniqueNames.length === 0) return [];

    // Tìm các tag đã tồn tại trong bảng tags
    const existingTags = await this.tagRepository.find({
      where: { name: In(uniqueNames) },
    });
    const existingNames = new Set(existingTags.map((t) => t.name));

    // Tạo instance mới cho những tag chưa có trong DB (cascade: ['insert'] sẽ tự lưu)
    const newTags = uniqueNames
      .filter((name) => !existingNames.has(name))
      .map((name) => this.tagRepository.create({ name }));

    return [...existingTags, ...newTags];
  }
}
