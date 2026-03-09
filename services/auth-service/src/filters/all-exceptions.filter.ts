import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'logger-ts';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const isClientError = status >= 400 && status < 500;
    const isProduction = process.env.NODE_ENV === 'production';

    const logMessage =
      exception instanceof Error ? exception.message : 'Internal server error';

    const meta = {
      requestId: request.headers['x-request-id'],
      method: request.method,
      path: request.url,
      status,
      error:
        !isProduction && exception instanceof Error
          ? exception.stack?.split('\n').slice(0, 2).join(' ')
          : undefined,
    };

    if (isClientError) {
      this.logger.warn(logMessage, meta);
    } else {
      this.logger.error(logMessage, meta);
    }

    const responseMessage = isHttpException
      ? exception.message
      : 'Internal server error';

    response
      .status(status)
      .json({ statusCode: status, message: responseMessage });
  }
}
