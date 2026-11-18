import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AttachmentEntity } from './entities/attachment.entity.js';
import { existsSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
@Injectable()
export class AttachmentsService {
  findUserAvatar(id: number) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly attachmentRepository: Repository<AttachmentEntity>,
  ) {}

  async replaceUserImage(
    manager: EntityManager,
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ attachment: AttachmentEntity; oldFileUrl: string | null }> {
    // 1. Tìm bản ghi ảnh cũ (nếu có) trong cùng transaction
    const existingAttachment = await manager.findOne(AttachmentEntity, {
      where: {
        attachable_type: 'User',
        attachable_id: userId,
      },
    });
    const oldFileUrl = existingAttachment ? existingAttachment.url : null;
    if (existingAttachment) {
      await manager.remove(existingAttachment);
    }

    // 2. Tạo đường dẫn lưu file mới (vd: uploads/avatars/<uuid>.png)
    const fileExt = extname(file.originalname);
    const uniqueFileName = `${randomUUID()}${fileExt}`;
    const relativePath = `storage/private/avatars/${uniqueFileName}`;

    // 3. Lưu metadata ảnh mới vào DB (chưa ghi file ra ổ đĩa vội)
    const newAttachment = manager.create(AttachmentEntity, {
      attachable_type: 'User',
      attachable_id: userId,
      url: relativePath,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
    });
    const savedAttachment = await manager.save(newAttachment);

    return { attachment: savedAttachment, oldFileUrl };
  }

  async deleteFileIfExists(relativePath: string | null): Promise<void> {
    if (!relativePath) return;
    const fullPath = join(process.cwd(), relativePath);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  async writeBufferToDisk(relativePath: string, buffer: Buffer): Promise<void> {
    const fullPath = join(process.cwd(), relativePath);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async findUserImage(userId: number): Promise<AttachmentEntity | null> {
    return this.attachmentRepository.findOne({
      where: {
        attachable_type: 'User',
        attachable_id: userId,
      },
    });
  }

  async findById(id: string): Promise<AttachmentEntity> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException('translation.file.not_found');
    }
    return attachment;
  }
}
