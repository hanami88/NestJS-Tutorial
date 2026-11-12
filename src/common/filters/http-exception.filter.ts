import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { I18nContext } from 'nestjs-i18n';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Lấy message gốc (ví dụ: 'auth.email_or_username_exists')
    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message: string | string[] }).message;

    // Lấy context i18n hiện tại để dịch
    const i18n = I18nContext.current(host);

    const translatedMessage = Array.isArray(rawMessage)
      ? rawMessage.map((msg) => (i18n ? i18n.t(msg) : msg))
      : i18n
        ? i18n.t(rawMessage)
        : rawMessage;

    response.status(status).json({
      statusCode: status,
      message: translatedMessage,
      error: exception.name,
    });
  }
}
