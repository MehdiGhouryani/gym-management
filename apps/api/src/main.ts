import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getSecrets } from './config/secrets';
import { buildOpenApiDocument, docsEnabled } from './openapi/document';

const DOCS_PATH = 'api/v1/docs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // پشت Nginx: IP واقعی برای محدودیت نرخ و لاگ ممیزی
  getSecrets(); // اگر JWT_SECRET یا OTP_PEPPER تنظیم نشده باشد، همین‌جا متوقف می‌شود
  // CSP پیش‌فرض helmet اسکریپت‌های درونی Swagger UI را می‌بندد؛ فقط برای مسیر مستندات کنار گذاشته می‌شود
  const secure = helmet();
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(`/${DOCS_PATH}`) ? next() : secure(req, res, next),
  );
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',') });
  if (docsEnabled()) SwaggerModule.setup(DOCS_PATH, app, buildOpenApiDocument() as unknown as OpenAPIObject);
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();
