import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createE2EApp, truncateDatabase } from './helpers/e2e-app.helper.js';
import { UserEntity } from '../src/users/entities/user.entity.js';
import { ArticleEntity } from '../src/articles/entities/article.entity.js';
import { CommentEntity } from '../src/comments/entities/comment.entity.js';
import { FollowEntity } from '../src/profiles/entities/follow.entity.js';
import { RedisService } from '../src/redis/redis.service.js';
import { MAX_COMMENT_BODY_LENGTH } from '../src/comments/dto/comment.dto.js';

describe('CommentsController (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let configService: ConfigService;
  let redisService: RedisService;
  const blacklistedTokens: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
    redisService = app.get(RedisService);
  });

  afterEach(async () => {
    await truncateDatabase(dataSource);
    if (blacklistedTokens.length > 0) {
      const redisClient = (redisService as any).redisClient;
      await redisClient.del(...blacklistedTokens);
      blacklistedTokens.length = 0;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedUser(overrides: Partial<UserEntity> = {}) {
    const userRepo = dataSource.getRepository(UserEntity);
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const user = userRepo.create({
      email: overrides.email ?? `user_${suffix}@example.com`,
      username: overrides.username ?? `user_${suffix}`,
      password: overrides.password ?? 'hashed-password',
      bio: overrides.bio ?? 'Test bio',
    });
    return userRepo.save(user);
  }

  async function createToken(user: UserEntity, expiresIn = '1h') {
    return jwtService.signAsync(
      { id: user.id, email: user.email, username: user.username },
      {
        secret: configService.get<string>('JWT_SECRET'),
        expiresIn: expiresIn as any,
      },
    );
  }

  async function blacklistToken(token: string, ttlSeconds = 3600) {
    await redisService.addToBlacklist(token, ttlSeconds);
    blacklistedTokens.push(token);
  }

  async function seedArticle(
    author: UserEntity,
    overrides: Partial<ArticleEntity> = {},
  ) {
    const articleRepo = dataSource.getRepository(ArticleEntity);
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const article = articleRepo.create({
      slug: overrides.slug ?? `test-article-${suffix}`,
      title: overrides.title ?? 'Test Article',
      description: overrides.description ?? 'Test Description',
      body: overrides.body ?? 'Test Body',
      authorId: author.id,
    });
    return articleRepo.save(article);
  }

  async function seedFollow(followerId: number, followingId: number) {
    const followRepo = dataSource.getRepository(FollowEntity);
    const follow = followRepo.create({
      follower_id: followerId,
      following_id: followingId,
    });
    return followRepo.save(follow);
  }

  async function seedComment(
    article: ArticleEntity,
    author: UserEntity,
    overrides: Partial<CommentEntity> = {},
  ) {
    const commentRepo = dataSource.getRepository(CommentEntity);
    const comment = commentRepo.create({
      body: overrides.body ?? 'Sample comment',
      articleId: article.id,
      authorId: author.id,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
      ...(overrides.updatedAt ? { updatedAt: overrides.updatedAt } : {}),
    });
    return commentRepo.save(comment);
  }

  describe('POST /api/articles/:slug/comments', () => {
    it('201: should create comment, trim body, return RealWorld format, and persist in DB', async () => {
      const user = await seedUser({ username: 'jake', bio: 'I work at statefarm' });
      const article = await seedArticle(user, { slug: 'how-to-train-dragon' });
      const token = await createToken(user);

      const res = await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: '   His name was my name too.   ' } })
        .expect(201);

      expect(res.body).toEqual({
        comment: {
          id: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          body: 'His name was my name too.',
          author: {
            username: 'jake',
            bio: 'I work at statefarm',
            image: null,
            following: false,
          },
        },
      });

      const saved = await dataSource
        .getRepository(CommentEntity)
        .findOne({ where: { id: res.body.comment.id } });
      expect(saved).not.toBeNull();
      expect(saved?.body).toBe('His name was my name too.');
      expect(saved?.articleId).toBe(article.id);
      expect(saved?.authorId).toBe(user.id);
    });

    it('400: should fail when comment field is missing', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });

    it('400: should fail when comment is an array or primitive', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: [] })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: 'invalid-string' })
        .expect(400);
    });

    it('400: should fail when body is empty or whitespace only', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: '' } })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: '     ' } })
        .expect(400);
    });

    it('400: should fail when body exceeds MAX_COMMENT_BODY_LENGTH', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: 'a'.repeat(MAX_COMMENT_BODY_LENGTH + 1) } })
        .expect(400);
    });

    it('400: should fail when body is not a string', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: 12345 } })
        .expect(400);
    });

    it('401: should fail when no token, invalid/expired token, or blacklisted token', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);

      // No token
      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .send({ comment: { body: 'Hello' } })
        .expect(401);

      // Invalid token
      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ comment: { body: 'Hello' } })
        .expect(401);

      // Expired token
      const expiredToken = await createToken(user, '-1s');
      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ comment: { body: 'Hello' } })
        .expect(401);

      // Blacklisted token
      const validToken = await createToken(user);
      await blacklistToken(validToken);
      await request(app.getHttpServer())
        .post(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ comment: { body: 'Hello' } })
        .expect(401);
    });

    it('404: should fail when article slug does not exist', async () => {
      const user = await seedUser();
      const token = await createToken(user);

      await request(app.getHttpServer())
        .post('/api/articles/non-existent-slug/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: { body: 'Hello' } })
        .expect(404);
    });
  });

  describe('GET /api/articles/:slug/comments', () => {
    it('200 (Guest): should return comments with author.following === false', async () => {
      const author = await seedUser({ username: 'author1' });
      const article = await seedArticle(author, { slug: 'guest-comments-slug' });
      await seedComment(article, author, { body: 'Guest visible comment' });

      const res = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .expect(200);

      expect(res.body.comments).toHaveLength(1);
      expect(res.body.comments[0]).toMatchObject({
        body: 'Guest visible comment',
        author: {
          username: 'author1',
          following: false,
        },
      });
    });

    it('200 (Authenticated): should return following: true for followed author and false for unfollowed', async () => {
      const viewer = await seedUser({ username: 'viewer' });
      const followedAuthor = await seedUser({ username: 'followed' });
      const unfollowedAuthor = await seedUser({ username: 'unfollowed' });
      const article = await seedArticle(followedAuthor, { slug: 'auth-comments-slug' });

      await seedFollow(viewer.id, followedAuthor.id);
      await seedComment(article, followedAuthor, { body: 'From followed' });
      await seedComment(article, unfollowedAuthor, { body: 'From unfollowed' });

      const token = await createToken(viewer);

      const res = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.comments).toHaveLength(2);
      const byAuthor = new Map(
        res.body.comments.map((c: any) => [c.author.username, c.author.following]),
      );
      expect(byAuthor.get('followed')).toBe(true);
      expect(byAuthor.get('unfollowed')).toBe(false);
    });

    it('200 (Invalid or blacklisted token): should fallback to guest with following: false', async () => {
      const viewer = await seedUser({ username: 'viewer2' });
      const author = await seedUser({ username: 'author2' });
      const article = await seedArticle(author, { slug: 'fallback-guest-slug' });

      await seedFollow(viewer.id, author.id);
      await seedComment(article, author, { body: 'Comment' });

      // Invalid token
      const invalidRes = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', 'Bearer bad.token.here')
        .expect(200);
      expect(invalidRes.body.comments[0].author.following).toBe(false);

      // Blacklisted token
      const token = await createToken(viewer);
      await blacklistToken(token);
      const blacklistedRes = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(blacklistedRes.body.comments[0].author.following).toBe(false);
    });

    it('200 (Empty): should return { comments: [] } when article has no comments', async () => {
      const author = await seedUser();
      const article = await seedArticle(author, { slug: 'empty-comments-slug' });

      const res = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .expect(200);

      expect(res.body).toEqual({ comments: [] });
    });

    it('200 (Ordering): should return comments ordered newest first (createdAt DESC, id DESC)', async () => {
      const author = await seedUser();
      const article = await seedArticle(author, { slug: 'ordered-comments-slug' });

      const c1 = await seedComment(article, author, {
        body: 'First',
        createdAt: new Date('2026-01-01T10:00:00.000Z'),
      });
      const c2 = await seedComment(article, author, {
        body: 'Second',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      });
      const c3 = await seedComment(article, author, {
        body: 'Third (same timestamp as Second, higher id)',
        createdAt: new Date('2026-01-02T10:00:00.000Z'),
      });

      const res = await request(app.getHttpServer())
        .get(`/api/articles/${article.slug}/comments`)
        .expect(200);

      expect(res.body.comments.map((c: any) => c.id)).toEqual([c3.id, c2.id, c1.id]);
    });

    it('404: should fail when article slug does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/articles/non-existent-slug/comments')
        .expect(404);
    });
  });

  describe('DELETE /api/articles/:slug/comments/:id', () => {
    it('204: should allow author to delete own comment and remove from DB', async () => {
      const author = await seedUser();
      const article = await seedArticle(author, { slug: 'delete-own-slug' });
      const comment = await seedComment(article, author, { body: 'To be deleted' });
      const token = await createToken(author);

      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const found = await dataSource
        .getRepository(CommentEntity)
        .findOne({ where: { id: comment.id } });
      expect(found).toBeNull();
    });

    it('400: should fail when :id param is not an integer', async () => {
      const user = await seedUser();
      const article = await seedArticle(user);
      const token = await createToken(user);

      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/not-a-number`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('401: should fail when no token, invalid token, or blacklisted token', async () => {
      const author = await seedUser();
      const article = await seedArticle(author);
      const comment = await seedComment(article, author);

      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
        .expect(401);

      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      const token = await createToken(author);
      await blacklistToken(token);
      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('403: should forbid another user from deleting comment and keep it in DB', async () => {
      const author = await seedUser({ username: 'owner' });
      const otherUser = await seedUser({ username: 'attacker' });
      const article = await seedArticle(author, { slug: 'forbid-delete-slug' });
      const comment = await seedComment(article, author, { body: 'Protected' });
      const otherToken = await createToken(otherUser);

      await request(app.getHttpServer())
        .delete(`/api/articles/${article.slug}/comments/${comment.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      const stillExists = await dataSource
        .getRepository(CommentEntity)
        .findOne({ where: { id: comment.id } });
      expect(stillExists).not.toBeNull();
    });

    it('404: should fail when article slug does not exist, comment does not exist, or comment belongs to another article', async () => {
      const author = await seedUser();
      const article1 = await seedArticle(author, { slug: 'article-one' });
      const article2 = await seedArticle(author, { slug: 'article-two' });
      const commentOnArticle2 = await seedComment(article2, author);
      const token = await createToken(author);

      // Non-existent article slug
      await request(app.getHttpServer())
        .delete(`/api/articles/non-existent-slug/comments/${commentOnArticle2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Non-existent commentId
      await request(app.getHttpServer())
        .delete(`/api/articles/${article1.slug}/comments/999999`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      // Comment belongs to another article
      await request(app.getHttpServer())
        .delete(`/api/articles/${article1.slug}/comments/${commentOnArticle2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
