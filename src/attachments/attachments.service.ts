import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttachmentEntity } from './entities/attachment.entity.js';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(AttachmentEntity)
    private readonly attachmentRepository: Repository<AttachmentEntity>,
  ) {}

  async replaceUserAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<AttachmentEntity> {
    const existingAttachment = await this.attachmentRepository.findOne({
      where: {
        attachable_type: 'User',
        attachable_id: userId,
      },
    });

    if (existingAttachment) {
      const oldFilePath = join(process.cwd(), existingAttachment.url);
      if (existsSync(oldFilePath)) {
        await unlink(oldFilePath);
      }
      await this.attachmentRepository.remove(existingAttachment);
    }

    const normalizedPath = file.path.replace(/\\/g, '/');

    const newAttachment = this.attachmentRepository.create({
      attachable_type: 'User',
      attachable_id: userId,
      url: normalizedPath,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
    });

    return this.attachmentRepository.save(newAttachment);
  }

  async findUserAvatar(userId: number): Promise<AttachmentEntity | null> {
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
