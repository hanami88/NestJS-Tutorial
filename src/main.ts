import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setUpSwagger } from './swagger/setUpSwagger.js';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setUpSwagger(app);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field thừa không khai báo trong DTO
      transform: true, // Tự động chuyển đổi kiểu dữ liệu (VD: query params sang number)
    }),
  );
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT') || 3000);
}
bootstrap();
