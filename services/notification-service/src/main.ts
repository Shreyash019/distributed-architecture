import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.NOTIFICATION_SERVICE_PORT;
  if (!port) throw new Error('NOTIFICATION_SERVICE_PORT environment variable is not set');

  const app = await NestFactory.create(AppModule);
  await app.listen(port);
}
bootstrap();
