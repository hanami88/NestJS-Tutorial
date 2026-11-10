import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { RedisModule } from '../redis/redis.module.js'; // Thêm dòng này
import { JwtStrategy } from './jwt.strategy.js'; // Thêm dòng này

@Module({
  imports: [
    UsersModule,
    RedisModule, // Import vào đây
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy], // Khai báo JwtStrategy
  controllers: [AuthController],
})
export class AuthModule {}
