import { Type } from 'class-transformer';
import {
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateArticleDataDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  body?: string;
}

export class UpdateArticleDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateArticleDataDto)
  article: UpdateArticleDataDto;
}
