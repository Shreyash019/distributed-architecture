import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from 'logger-ts';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  getHello(): string {
    const data: string = this.appService.getHello();
    this.logger.info('getHello called');
    return data;
  }
}
