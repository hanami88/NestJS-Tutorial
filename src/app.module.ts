import { Module } from '@nestjs/common';
import * as path from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AcceptLanguageResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
