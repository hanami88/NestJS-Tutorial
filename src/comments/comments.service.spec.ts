import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentEntity } from './entities/comment.entity.js';
import { ArticleEntity } from '../articles/entities/article.entity.js';
import { ProfilesService } from '../profiles/profiles.service.js';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentRepository = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    find: vi.fn(),
    delete: vi.fn(),
  };

  const mockArticleRepository = {
    findOne: vi.fn(),
  };

  const mockProfilesService = {
    getProfilesByUsers: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(CommentEntity),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(ArticleEntity),
          useValue: mockArticleRepository,
        },
        {
          provide: ProfilesService,
          useValue: mockProfilesService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    vi.clearAllMocks();
  });

  describe('addComment', () => {
    it('should throw NotFoundException when article slug does not exist', async () => {
      mockArticleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addComment({ comment: { body: 'Hello' } }, 'non-existent-slug', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and return formatted comment', async () => {
      const now = new Date();
      const author = { id: 1, username: 'jake', bio: null };
      const savedComment = { id: 10, body: 'Hello', articleId: 5, authorId: 1 };
      const createdComment = {
        ...savedComment,
        createdAt: now,
        updatedAt: now,
        author,
      };
      const profile = {
        username: 'jake',
        bio: null,
        image: null,
        following: false,
      };

      mockArticleRepository.findOne.mockResolvedValue({ id: 5 });
      mockCommentRepository.create.mockReturnValue(savedComment);
      mockCommentRepository.save.mockResolvedValue(savedComment);
      mockCommentRepository.findOneOrFail.mockResolvedValue(createdComment);
      mockProfilesService.getProfilesByUsers.mockResolvedValue(
        new Map([[1, profile]]),
      );

      const result = await service.addComment(
        { comment: { body: 'Hello' } },
        'test-slug',
        1,
      );

      expect(result).toEqual({
        comment: {
          id: 10,
          createdAt: now,
          updatedAt: now,
          body: 'Hello',
          author: profile,
        },
      });
    });
  });

  describe('getComment', () => {
    it('should throw NotFoundException when article slug does not exist', async () => {
      mockArticleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getComment('non-existent-slug', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should query comments ordered newest first and return formatted list', async () => {
      const olderDate = new Date('2026-01-01T10:00:00.000Z');
      const newerDate = new Date('2026-01-02T10:00:00.000Z');
      const author = { id: 1, username: 'jake', bio: null };
      const profile = {
        username: 'jake',
        bio: null,
        image: null,
        following: false,
      };

      const comments = [
        {
          id: 2,
          body: 'Newest comment',
          createdAt: newerDate,
          updatedAt: newerDate,
          author,
        },
        {
          id: 1,
          body: 'Older comment',
          createdAt: olderDate,
          updatedAt: olderDate,
          author,
        },
      ];

      mockArticleRepository.findOne.mockResolvedValue({ id: 5 });
      mockCommentRepository.find.mockResolvedValue(comments);
      mockProfilesService.getProfilesByUsers.mockResolvedValue(
        new Map([[1, profile]]),
      );

      const result = await service.getComment('test-slug', 2);

      expect(mockCommentRepository.find).toHaveBeenCalledWith({
        where: { articleId: 5 },
        relations: { author: true },
        order: { createdAt: 'DESC', id: 'DESC' },
      });
      expect(result.comments.map((c) => c.id)).toEqual([2, 1]);
    });
  });

  describe('deleteComment', () => {
    it('should throw NotFoundException when article slug does not exist', async () => {
      mockArticleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteComment('non-existent-slug', 10, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when comment does not exist or belongs to another article', async () => {
      mockArticleRepository.findOne.mockResolvedValue({ id: 5 });
      mockCommentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteComment('test-slug', 99, 1),
      ).rejects.toThrow(NotFoundException);

      expect(mockCommentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 99, articleId: 5 },
        select: { id: true, authorId: true },
      });
    });

    it('should throw ForbiddenException when deleting another user comment', async () => {
      mockArticleRepository.findOne.mockResolvedValue({ id: 5 });
      mockCommentRepository.findOne.mockResolvedValue({ id: 10, authorId: 2 });

      await expect(
        service.deleteComment('test-slug', 10, 1),
      ).rejects.toThrow(ForbiddenException);

      expect(mockCommentRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete comment when current user is the author', async () => {
      mockArticleRepository.findOne.mockResolvedValue({ id: 5 });
      mockCommentRepository.findOne.mockResolvedValue({ id: 10, authorId: 1 });
      mockCommentRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteComment('test-slug', 10, 1);

      expect(mockCommentRepository.delete).toHaveBeenCalledWith(10);
    });
  });
});