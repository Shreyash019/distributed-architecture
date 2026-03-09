import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from 'logger-ts';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: LoggerService,
      useFactory: (config: ConfigService) => {
        return new LoggerService({
          serviceName: 'auth-service',
          environment: config.get<string>('NODE_ENV', 'development'),
          level: config.get<string>('LOG_LEVEL', 'info'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
