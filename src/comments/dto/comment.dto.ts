import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_COMMENT_BODY_LENGTH = 5000;

export class CommentDataDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_COMMENT_BODY_LENGTH)
  body: string;
}

export class CreateCommentDataDto {
  @ValidateNested()
  @Type(() => CommentDataDto)
  @IsNotEmpty()
  @IsObject()
  comment: CommentDataDto;
}
