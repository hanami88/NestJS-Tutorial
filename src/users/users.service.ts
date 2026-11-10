import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';

Injectable();
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
  ) {}

  async register(createUserDto: any): Promise<UserEntity> {
    const { username, email, password } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      throw new ConflictException('Email hoặc Username đã tồn tại');
    }

    // Băm mật khẩu với độ khó (salt rounds) là 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo và lưu user
    const newUser = this.usersRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    return this.usersRepository.save(newUser);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
