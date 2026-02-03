import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from './base-rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityLoggerService } from '../../utils/security-logger.service';
import { AllConfigType } from '../../../config/config.type';

@Injectable()
export class LoginRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = '/api/v1/auth/email/login';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const loginConfig = this.configService.get('security.rateLimit.login', {
      infer: true,
    });

    this.rateLimitConfig = new RateLimitConfig(
      loginConfig?.ttl || 600,
      loginConfig?.limit || 5,
    );
  }

  protected getIdentifier(request: Request): string {
    // Use IP only for login attempts
    return (request as any).realIp || request.ip || '0.0.0.0';
  }
}
