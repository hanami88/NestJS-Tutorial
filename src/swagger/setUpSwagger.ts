import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setUpSwagger(app: INestApplication): void {
  const SWAGGER_PATH = 'api/docs';
  const config = new DocumentBuilder()
    .setTitle('Medium Clone API')
    .setDescription('Tài liệu API cho dự án Medium Clone (RealWorld)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
