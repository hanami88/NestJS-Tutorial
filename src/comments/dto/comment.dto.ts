import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CommentDataDto {
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class CreateCommentDataDto {
  @ValidateNested()
  @Type(() => CommentDataDto)
  @IsNotEmpty()
  @IsObject()
  comment: CommentDataDto;
}
