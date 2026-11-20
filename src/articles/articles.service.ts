import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import slugify from 'slugify';
import { randomBytes } from 'crypto';
import { ArticleEntity } from './entities/article.entity.js';
import { TagEntity } from './entities/tag.entity.js';
import { CreateArticleRequestDto } from './dto/article.dto.js';
import {
  ArticleDataDto,
  MultipleArticlesResponseDto,
  SingleArticleResponseDto,
} from './dto/article-response.dto.js';
import { ProfilesService } from '../profiles/profiles.service.js';
import { UserEntity } from '../users/entities/user.entity.js';
import { UpdateArticleDataDto } from './dto/update-article.dto.js';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto.js';

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
    dto: CreateArticleRequestDto,
  ): Promise<SingleArticleResponseDto> {
    // 1. Tạo slug duy nhất từ title
    const articleDto = dto.article;
    const slug = this.generateSlug(articleDto.title);

    // 2. Xử lý danh sách tags (tìm tag đã có + tạo tag chưa có)
    const tags = await this.resolveTags(articleDto.tagList);

    // 3. Khởi tạo và lưu bài viết vào DB
    const newArticle = this.articleRepository.create({
      slug,
      title: articleDto.title,
      description: articleDto.description,
      body: articleDto.body,
      authorId,
      tags,
    });

    const savedArticle = await this.articleRepository.save(newArticle);

    // 4. Tải lại bài viết kèm author & tags và tái sử dụng formatArticlesList
    const createdArticle = await this.articleRepository.findOneOrFail({
      where: { id: savedArticle.id },
      relations: {
        author: true,
        tags: true,
      },
    });

    const [formattedArticle] = await this.formatArticlesList(
      [createdArticle],
      authorId,
    );

    return {
      article: formattedArticle,
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
        .orIgnore()
        .execute();
    }

    // 4. Tải lại toàn bộ danh sách TagEntity chuẩn từ DB
    return this.tagRepository.find({
      where: { name: In(uniqueNames) },
    });
  }

  async listArticles(
    query: ListArticlesQueryDto,
    currentUserId?: number,
  ): Promise<MultipleArticlesResponseDto> {
    const { tag, author, favorited, limit = 20, offset = 0 } = query;

    // 1. Khởi tạo QueryBuilder (không join select favoritedBy)
    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag');

    // 2. Cộng dồn điều kiện lọc
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
    query: ListArticlesQueryDto,
    currentUserId: number,
  ): Promise<MultipleArticlesResponseDto> {
    const { limit = 20, offset = 0 } = query;

    // 1. Khởi tạo QueryBuilder (không join select favoritedBy)
    const qb = this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.tags', 'tag')
      .where(
        'article.author_id IN (SELECT following_id FROM follows WHERE follower_id = :currentUserId)',
        { currentUserId },
      );

    const [articles, articlesCount] = await qb
      .orderBy('article.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

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
    currentUserId?: number,
  ): Promise<SingleArticleResponseDto> {
    // 1. Tìm bài viết theo slug kèm author & tags (không load favoritedBy)
    const article = await this.articleRepository.findOne({
      where: { slug },
      relations: {
        author: true,
        tags: true,
      },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

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

    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('translation.article.update_forbidden');
    }

    // 2. Gom duy nhất các trường thực sự thay đổi vào object updateData
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

    if (Object.keys(updateData).length > 0) {
      await this.articleRepository.update(article.id, updateData);
    }

    // 3. Tải lại bài viết kèm author & tags (không load favoritedBy)
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
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

    if (article.author.id !== currentUserId) {
      throw new ForbiddenException('translation.article.forbidden');
    }

    await this.articleRepository.remove(article);
  }

  async favoriteArticle(
    slug: string,
    currentUserId: number,
  ): Promise<SingleArticleResponseDto> {
    const article = await this.articleRepository.findOne({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // Chèn trực tiếp vào bảng trung gian (bỏ qua nếu đã tồn tại)
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

    // Tải lại bài viết kèm author & tags (không load favoritedBy)
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
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
    const article = await this.articleRepository.findOne({
      where: { slug },
    });

    if (!article) {
      throw new NotFoundException('translation.article.not_found');
    }

    // Xóa trực tiếp cặp (article_id, user_id) trong bảng trung gian
    await this.articleRepository
      .createQueryBuilder()
      .delete()
      .from('article_favorites')
      .where('article_id = :articleId AND user_id = :userId', {
        articleId: article.id,
        userId: currentUserId,
      })
      .execute();

    // Tải lại bài viết kèm author & tags (không load favoritedBy)
    const updatedArticle = await this.articleRepository.findOne({
      where: { id: article.id },
      relations: {
        author: true,
        tags: true,
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

  // Hàm helper chuyển đổi mảng ArticleEntity[] sang ArticleDataDto[]
  private async formatArticlesList(
    articles: ArticleEntity[],
    currentUserId?: number,
  ): Promise<ArticleDataDto[]> {
    if (articles.length === 0) {
      return [];
    }

    const authors = articles.map((article) => article.author);
    const articleIds = articles.map((article) => article.id);

    // Chạy song song: lấy profiles tác giả + đếm favoritesCount + kiểm tra favorited
    const [profilesMap, favoriteCountRows, favoriteRows] = await Promise.all([
      this.profilesService.getProfilesByUsers(authors, currentUserId),
      this.articleRepository.manager
        .createQueryBuilder()
        .select('af.article_id', 'articleId')
        .addSelect('COUNT(*)', 'count')
        .from('article_favorites', 'af')
        .where('af.article_id IN (:...articleIds)', { articleIds })
        .groupBy('af.article_id')
        .getRawMany<{ articleId: string | number; count: string | number }>(),
      currentUserId
        ? this.articleRepository.manager
            .createQueryBuilder()
            .select('af.article_id', 'articleId')
            .from('article_favorites', 'af')
            .where('af.user_id = :currentUserId', { currentUserId })
            .andWhere('af.article_id IN (:...articleIds)', { articleIds })
            .getRawMany<{ articleId: string | number }>()
        : Promise.resolve([]),
    ]);

    const favoritesCountMap = new Map(
      favoriteCountRows.map((row) => [
        Number(row.articleId),
        Number(row.count),
      ]),
    );
    const favoritedArticleIds = new Set(
      favoriteRows.map((row) => Number(row.articleId)),
    );

    return articles.map((article) => {
      const authorProfile = profilesMap.get(article.author.id)!;

      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        body: article.body,
        tagList: article.tags ? article.tags.map((t) => t.name).sort() : [],
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        favorited: favoritedArticleIds.has(article.id),
        favoritesCount: favoritesCountMap.get(article.id) ?? 0,
        author: authorProfile,
      };
    });
  }
}
