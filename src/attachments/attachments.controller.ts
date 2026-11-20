import {
  Controller,
  Get,
  Param,
  StreamableFile,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { AttachmentsService } from './attachments.service.js';

@Controller('api/attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}
  @Get(':id')
  async getFile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const attachment = await this.attachmentsService.findById(id);
    const fullPath = join(process.cwd(), attachment.url);

    if (!existsSync(fullPath)) {
      console.log('cc');
      throw new NotFoundException('translation.file.not_found');
    }

    const fileStream = createReadStream(fullPath);

    return new StreamableFile(fileStream, {
      type: attachment.file_type,
      disposition: `inline; filename="${attachment.file_name}"`,
    });
  }
}
