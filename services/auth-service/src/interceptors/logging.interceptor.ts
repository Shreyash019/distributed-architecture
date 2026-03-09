import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { LoggerService } from 'logger-ts';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = (request as Request & { startTime: number }).startTime;

    return next.handle().pipe(
      tap(() => {
        const durationMs = parseFloat((performance.now() - start).toFixed(2));
        this.logger.info(`${method} ${url} completed`, {
          context: 'LoggingInterceptor',
          requestId: request.headers['x-request-id'] as string | undefined,
          method,
          path: url,
          durationMs,
        });
      }),
    );
  }
}
