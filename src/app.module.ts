import { Module } from '@nestjs/common';
import * as path from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './common/config/data-source.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { ArticlesModule } from './articles/articles.module.js';
import { CommentsModule } from './comments/comments.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      autoLoadEntities: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(import.meta.dirname, 'i18n'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] }, // Hỗ trợ lấy ngôn ngữ qua query (VD: ?lang=vi)
        AcceptLanguageResolver, // Hỗ trợ lấy qua header Accept-Language
      ],
    }),
    UsersModule,
    AuthModule,
    RedisModule,
    ProfilesModule,
    AttachmentsModule,
    ArticlesModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
