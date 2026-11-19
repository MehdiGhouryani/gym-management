import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { getSecrets } from './config/secrets';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { isAllowedOrigin } from './common/origin';
import { buildOpenApiDocument, docsEnabled } from './openapi/document';

const DOCS_PATH = 'api/v1/docs';
const ALLOWED_ORIGINS = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').split(',').map((s) => s.trim());

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1); // پشت Nginx: IP واقعی برای محدودیت نرخ و لاگ ممیزی
  getSecrets(); // اگر JWT_SECRET یا OTP_PEPPER تنظیم نشده باشد، همین‌جا متوقف می‌شود
  // CSP پیش‌فرض helmet اسکریپت‌های درونی Swagger UI را می‌بندد؛ فقط برای مسیر مستندات کنار گذاشته می‌شود
  const secure = helmet();
  app.use((req: Request, res: Response, next: NextFunction) =>
    req.path.startsWith(`/${DOCS_PATH}`) ? next() : secure(req, res, next),
  );
  app.use(cookieParser());
  // دفاع در عمق CSRF: درخواست تغییردهنده با Origin ناشناس رد می‌شود (اپ Origin نمی‌فرستد؛ مرورگر همیشه می‌فرستد)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const mutating = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    if (mutating && !isAllowedOrigin(req.headers.origin, ALLOWED_ORIGINS)) {
      res.status(403).json({ message: 'مبدأ درخواست مجاز نیست', code: 'ORIGIN_FORBIDDEN' });
      return;
    }
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: ALLOWED_ORIGINS, credentials: true });
  if (docsEnabled()) SwaggerModule.setup(DOCS_PATH, app, buildOpenApiDocument() as unknown as OpenAPIObject);
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();
