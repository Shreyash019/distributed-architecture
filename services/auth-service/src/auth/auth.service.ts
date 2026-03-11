// auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthUser } from '../databases/auth-service.entity';
import { LoggerService } from 'logger-ts';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthUser)
    private usersRepo: Repository<AuthUser>,
    private jwtService: JwtService,
    private logger: LoggerService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersRepo.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash'],
    });
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      return user;
    }
    return null;
  }

  async login(user: AuthUser) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepo.update(user.id, { refreshTokenHash });
    return { accessToken, refreshToken };
  }

  async signup(email: string, password: string) {
    const existing = await this.usersRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepo.create({ email, passwordHash });
    await this.usersRepo.save(user);
    this.logger.info(`Sign up completed`, { meta: { email: email } });
    return this.login(user); // Optionally auto-login after signup
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'refreshTokenHash', 'email'],
    });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException();
    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException();
    return this.login(user);
  }

  async logout(userId: string) {
    await this.usersRepo.update(userId, { refreshTokenHash: undefined });
  }
}
