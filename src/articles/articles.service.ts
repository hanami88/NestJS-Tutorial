import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import slugify from 'slugify';
import { randomBytes } from 'crypto';
import { ArticleEntity } from './entities/article.entity.js';
import { TagEntity } from './entities/tag.entity.js';
import { CreateArticleDataDto } from './dto/article.dto.js';
import {
  ArticleDataDto,
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import { UserEntity } from '../users/entities/user.entity.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateArticleDataDto } from './dto/update-article.dto.js';
interface ArticleFilterQuery {
  tag?: string;
  author?: string;
  favorited?: string;
  limit?: number;
  offset?: number;
}

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

    // 1. Chuẩn hóa và lọc trùng tên tag trong cùng một request
    const uniqueNames = Array.from(
      new Set(tagList.map((t) => t.trim()).filter((t) => t.length > 0)),
    );

    if (uniqueNames.length === 0) {
      return [];
    }

    // 2. Tìm các tag đã tồn tại
    const existingTags = await this.tagRepository.find({
      where: { name: In(uniqueNames) },
    });
    const existingNames = new Set(existingTags.map((tag) => tag.name));

    // 3. Lọc ra các tên tag chưa có và dùng INSERT IGNORE (.orIgnore()) để chèn an toàn
    const newTagValues = uniqueNames
      .filter((name) => !existingNames.has(name))
      .map((name) => ({ name }));

    if (newTagValues.length > 0) {
      await this.tagRepository
        .createQueryBuilder()
        .insert()
        .into(TagEntity)
        .values(newTagValues)
        .orIgnore() // Nếu request khác vừa kịp chèn trước thì bỏ qua, không báo lỗi Duplicate entry
        .execute();
    }

    // 4. Tải lại toàn bộ danh sách TagEntity chuẩn từ DB (đều đã có đầy đủ id) để gắn vào bài viết
    return this.tagRepository.find({
      where: { name: In(uniqueNames) },
    });
  }

  async listArticles(
    query: ArticleFilterQuery,
    currentUserId?: number,
  ): Promise<MultipleArticlesResponseDto> {
    const { tag, author, favorited, limit = 20, offset = 0 } = query;
    // 1. Khởi tạo QueryBuilder và join các bảng liên quan
    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag')
      .leftJoinAndSelect('article.favoritedBy', 'favoritedBy');
    // 2. Cộng dồn điều kiện lọc dựa trên các thuộc tính có trong object query
    if (author) {
      qb.andWhere('author.username = :author', { author });
    }
    if (tag) {
      qb.andWhere((subQb) => {
        const subQuery = subQb
          .subQuery()
          .select('a.id')
          .from(ArticleEntity, 'a')
          .innerJoin('a.tags', 't')
          .where('t.name = :tag')
          .getQuery();
        return 'article.id IN ' + subQuery;
      }).setParameter('tag', tag);
    }

    if (favorited) {
      qb.innerJoin(
        'article.favoritedBy',
        'favoritedUser',
        'favoritedUser.username = :favorited',
        { favorited },
      );
    }
    const [articles, articlesCount] = await qb
      .orderBy('article.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    // Bước chuyển đổi Entity[] -> ArticleDataDto[]
    const formattedArticles = await this.formatArticlesList(
      articles,
      currentUserId,
    );

    return {
      articles: formattedArticles,
      articlesCount,
    };
  }

  async feedArticle(
    query: ArticleFilterQuery,
    currentUserId: number,
  ): Promise<MultipleArticlesResponseDto> {
    const { limit = 20, offset = 0 } = query;
    // 1. Khởi tạo QueryBuilder và join các bảng liên quan
    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag')
      .leftJoinAndSelect('article.favoritedBy', 'favoritedBy')
      .where(
        'article.author_id IN (SELECT following_id FROM follows WHERE follower_id = :currentUserId)',
        { currentUserId },
      );

    const [articles, articlesCount] = await qb
      .orderBy('article.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    // Bước chuyển đổi Entity[] -> ArticleDataDto[]
    const formattedArticles = await this.formatArticlesList(
      articles,
      currentUserId,
    );

    return {
      articles: formattedArticles,
      articlesCount,
    };
  }

  async getArticle(
    slug: string,
    currentUserId: number,
  ): Promise<SingleArticleResponseDto> {
    // 1. Tìm bài viết theo slug kèm các quan hệ liên quan
    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: {
        author: true,
        tags: true,
        favoritedBy: true,
      },
    });

    // 2. Ném lỗi 404 nếu slug không tồn tại
    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // 3. Tái sử dụng hàm formatArticlesList để map sang ArticleDataDto
    const [formattedArticle] = await this.formatArticlesList(
      [article],
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }
  async updateArticle(
    slug: string,
    dto: UpdateArticleDataDto,
    currentUserId: number,
  ): Promise<SingleArticleResponseDto> {
    // 1. Chỉ load thông tin cơ bản và author để kiểm tra quyền sở hữu
    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: {
        author: true,
      },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // 2. Dùng key thông báo lỗi riêng cho quyền chỉnh sửa (không dùng chung thông báo xóa)
    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('translation.article.update_forbidden');
    }

    // 3. Gom duy nhất các trường thực sự thay đổi vào object updateData
    const updateData: Partial<ArticleEntity> = {};

    if (dto.title !== undefined && dto.title !== article.title) {
      updateData.title = dto.title;
      updateData.slug = this.generateSlug(dto.title);
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.body !== undefined) {
      updateData.body = dto.body;
    }

    // 4. Chỉ thực thi lệnh UPDATE nếu có ít nhất 1 trường thay đổi
    // Câu lệnh SQL sinh ra chỉ tác động đúng các cột trong updateData, không chạm vào favoritedBy hay tags
    if (Object.keys(updateData).length > 0) {
      await this.articleRepository.update(article.id, updateData);
    }

    // 5. Tải lại bài viết với đầy đủ relations mới nhất từ DB để format trả về
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
        favoritedBy: true,
      },
    });

    const [formattedArticle] = await this.formatArticlesList(
      [updatedArticle!],
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }

  async deleteArticle(slug: string, currentUserId: number): Promise<void> {
    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: {
        author: true,
      },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // Chỉ tác giả bài viết mới được phép xóa
    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('translation.article.forbidden');
    }

    await this.articleRepository.remove(article);
  }

  async favoriteArticle(
    slug: string,
    currentUserId: number,
  ): Promise<SingleArticleResponseDto> {
    // 1. Chỉ lấy thông tin cơ bản (id) của bài viết, không cần load relations ở đây
    const article = await this.articleRepository.findOne({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // 2. Chèn trực tiếp vào bảng trung gian (bỏ qua nếu đã tồn tại)
    await this.articleRepository
      .createQueryBuilder()
      .insert()
      .into('article_favorites')
      .values({
        article_id: article.id,
        user_id: currentUserId,
      })
      .orIgnore()
      .execute();

    // 3. Tải lại bài viết kèm đầy đủ relations mới nhất từ DB
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
        favoritedBy: true,
      },
    });

    const [formattedArticle] = await this.formatArticlesList(
      [updatedArticle!],
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }

  async unfavoriteArticle(
    slug: string,
    currentUserId: number,
  ): Promise<SingleArticleResponseDto> {
    // 1. Chỉ lấy thông tin cơ bản (id) của bài viết
    const article = await this.articleRepository.findOne({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // 2. Xóa trực tiếp cặp (article_id, user_id) trong bảng trung gian
    await this.articleRepository
      .createQueryBuilder()
      .delete()
      .from('article_favorites')
      .where('article_id = :articleId AND user_id = :userId', {
        articleId: article.id,
        userId: currentUserId,
      })
      .execute();

    // 3. Tải lại bài viết kèm đầy đủ relations mới nhất từ DB
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
        favoritedBy: true,
      },
    });

    // Sửa [article] thành [updatedArticle!] ở đây
    const [formattedArticle] = await this.formatArticlesList(
      [updatedArticle!],
      currentUserId,
    );

    return {
      article: formattedArticle,
    };
  }
  // Hàm helper chuyển đổi mảng ArticleEntity[] sang ArticleDataDto[]
  private async formatArticlesList(
    articles: ArticleEntity[],
    currentUserId?: number,
  ): Promise<ArticleDataDto[]> {
    if (articles.length === 0) {
      return [];
    }

    // 1. Lấy danh sách username của các tác giả không trùng lặp để tránh query lặp lại nếu 1 người viết nhiều bài
    const uniqueUsernames = Array.from(
      new Set(articles.map((article) => article.author.username)),
    );

    // 2. Lấy thông tin profile (kèm avatar image từ bảng attachments & trạng thái following)
    const profilesMap = new Map<
      string,
      {
        username: string;
        bio: string | null;
        image: string | null;
        following: boolean;
      }
    >();

    await Promise.all(
      uniqueUsernames.map(async (username) => {
        const { profile } = await this.profilesService.getProfile(
          username,
          currentUserId,
        );
        profilesMap.set(username, {
          username: profile.username,
          bio: profile.bio ?? null,
          image: profile.image ?? null,
          following: profile.following,
        });
      }),
    );

    // 3. Map từng ArticleEntity sang cấu trúc JSON chuẩn của RealWorld
    return articles.map((article) => {
      const favoritedBy = article.favoritedBy ?? [];
      const isFavorited = favoritedBy.some((user) => user.id === currentUserId);
      const authorProfile = profilesMap.get(article.author.username)!;
      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tags ? article.tags.map((t) => t.name).sort() : [],
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        favorited: isFavorited,
        favoritesCount: favoritedBy.length,
        author: authorProfile,
      };
    });
  }
}
