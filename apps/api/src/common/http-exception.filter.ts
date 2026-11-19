import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** پاکت خطای استاندارد: { statusCode, message, code?, ...جزئیات }؛ همه‌ی مسیرها از آن عبور می‌کنند */
export function normalizeErrorBody(status: number, response: unknown): Record<string, unknown> {
  if (typeof response === 'string') return { statusCode: status, message: response };
  const body = response as Record<string, unknown>;
  return { statusCode: status, ...body };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = normalizeErrorBody(status, exception.getResponse());
      res.status(status).json(payload);
      return;
    }
    // خطای غیرمنتظره: لاگ کامل در سرور، بدنه‌ی ثابت و بی‌خطر برای کلاینت
    this.log.error(String(exception instanceof Error ? exception.stack : exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'خطای داخلی سرور',
      code: 'INTERNAL',
    });
  }
}
