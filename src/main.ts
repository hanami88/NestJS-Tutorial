import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setUpSwagger } from './swagger/setUpSwagger.js';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setUpSwagger(app);
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT') || 3000);
}
bootstrap();
