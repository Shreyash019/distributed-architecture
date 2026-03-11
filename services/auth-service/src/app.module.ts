import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { RequestTimingMiddleware } from './middleware/request-timing.middleware';
import { TypeOrmRootModule } from './databases/TypeOrmModule';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmRootModule,
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestTimingMiddleware).forRoutes('*');
  }
}
