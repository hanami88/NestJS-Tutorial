import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72) // Quan trọng: Bcrypt chỉ băm tối đa 72 byte, chặn ngay từ cổng
  password: string;
}
