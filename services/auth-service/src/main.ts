import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { LoggerService } from 'logger-ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter(app.get(LoggerService)));
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(LoggerService)));
  console.log('Auth Service');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
