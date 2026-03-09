import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    let count: number = 0;
    for (let i: number = 0; i <= 1_000_000_000; i++) {
      count += 1;
    }
    return 'Hello World!' + count;
  }
}
