import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Thiết lập cấu hình cơ bản cho Swagger
  const config = new DocumentBuilder()
    .setTitle('Medium Clone API')
    .setDescription('Tài liệu API cho dự án Medium Clone (RealWorld)')
    .setVersion('1.0')
    .addBearerAuth() // Chuẩn bị sẵn UI để nhập token JWT cho các PR sau
    .build();

  // Tạo document và setup endpoint
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Truy cập qua đường dẫn /api/docs

  await app.listen(3000);
}
bootstrap();
