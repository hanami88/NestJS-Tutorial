import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateArticleDataDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagList?: string[];
}

export class CreateArticleRequestDto {
  @ValidateNested()
  @Type(() => CreateArticleDataDto)
  @IsNotEmpty()
  article: CreateArticleDataDto;
}
