import {
  Controller,
  Get,
  Req,
  Param,
  Query,
  Session,
  Headers,
  HostParam,
  Ip,
  Logger,
  HttpCode,
  Header,
} from '@nestjs/common';
import { AppService } from './app.service';
import type { Request } from 'express';

@Controller()
export class AppController {
  private readonly logger = new Logger();

  constructor(private readonly appService: AppService) {}

  @Get()
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  getHello(
    @Req() request: Request,
    @Param() params: any,
    @Query() queries: any,
    @Session() session: any,
    @Headers() headers: any,
    @Ip() ip: any,
    @HostParam() hostParams: any,
  ): string {
    this.logger.log(`Allowed origins:->`, request.headers.origin);
    const clientId = request.ip || request.socket.remoteAddress || 'unknown';
    this.logger.log(`Client Info:->`, {
      clientId,
      userAgent: request.get('user-agent'),
      referer: request.get('referer'),
      remoteAddress: request.socket.remoteAddress,
    });
    this.logger.log(`Incoming session:->`, JSON.stringify(session));
    this.logger.log(`Incoming headers:->`, JSON.stringify(headers));
    this.logger.log(`Incoming ip:->`, ip);
    this.logger.log(`Incoming hostParams:->`, hostParams);
    this.logger.log(`Incoming params:->`, JSON.stringify(params));
    this.logger.log(`Incoming queries:->`, JSON.stringify(queries));
    return this.appService.getHello();
  }

  @Get('/:od')
  getHelloWithParams(
    @Req() request: Request,
    @Param() params: any,
    @Query() queries: any,
    @Session() session: any,
    @Headers() headers: any,
    @Ip() ip: any,
    @HostParam() hostParams: any,
  ): string {
    this.logger.log(`Incoming request: ${request.method} ${request.path}`);
    this.logger.log(`Incoming session: `, session);
    this.logger.log(`Incoming headers: ${session}`, headers);
    this.logger.log(`Incoming ip: ${ip}`, ip);
    this.logger.log(`Incoming hostParams: ${hostParams}`, hostParams);
    this.logger.log(`Incoming params:`, JSON.stringify(params));
    this.logger.log(`Incoming queries: `, JSON.stringify(queries));
    return this.appService.getHello();
  }
  @Get('/wild/*splat')
  getHelloWithWildcards(
    @Req() request: Request,
    @Param() params: any,
    @Query() queries: any,
    @Session() session: any,
    @Headers() headers: any,
    @Ip() ip: any,
    @HostParam() hostParams: any,
  ): string {
    this.logger.log(`Incoming request: ${request.method} ${request.path}`);
    this.logger.log(`Incoming session: `, session);
    this.logger.log(`Incoming headers: ${session}`, headers);
    this.logger.log(`Incoming ip: ${ip}`, ip);
    this.logger.log(`Incoming hostParams: ${hostParams}`, hostParams);
    this.logger.log(`Incoming params:`, JSON.stringify(params));
    this.logger.log(`Incoming queries: `, JSON.stringify(queries));
    return 'This is wild';
  }
}
