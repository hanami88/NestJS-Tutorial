import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { memoryStorage } from 'multer';

export const avatarMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException('translation.file.invalid_type'),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Tối đa 5MB
  },
};
