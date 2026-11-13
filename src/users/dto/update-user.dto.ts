import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'translation.auth.invalid_email' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'translation.auth.username_too_short' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'translation.auth.password_too_short' })
  password?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
