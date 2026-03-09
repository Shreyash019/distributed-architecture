import * as winston from 'winston';
import { LoggerConfig } from './LoggerConfig';

export class LoggerService {
  private logger: winston.Logger;

  constructor(private config: LoggerConfig) {
    const logFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const log = {
        timestamp,
        level,
        service: config.serviceName,
        environment: config.environment,
        context: meta.context || undefined,
        traceId: meta.traceId,
        spanId: meta.spanId,
        requestId: meta.requestId,
        userId: meta.userId,
        method: meta.method || undefined,
        path: meta.path || undefined,
        status: meta.status || undefined,
        durationMs: meta.durationMs || undefined,
        message,
        error: meta.error || null,
        meta: meta.meta || undefined,
      };
      return JSON.stringify(log);
    });

    this.logger = winston.createLogger({
      level: config.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        logFormat
      ),
      transports: [new winston.transports.Console()],
    });
  }

  info(message: string, meta?: Record<string, any>) {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.logger.debug(message, meta);
  }
}