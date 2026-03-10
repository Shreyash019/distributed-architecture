import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { LoggerService } from 'logger-ts';

async function bootstrap() {
  const port = process.env.AUTH_SERVICE_PORT;
  if (!port) throw new Error('AUTH_SERVICE_PORT environment variable is not set');

  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter(app.get(LoggerService)));
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(LoggerService)));
  await app.listen(port);
}
bootstrap();
