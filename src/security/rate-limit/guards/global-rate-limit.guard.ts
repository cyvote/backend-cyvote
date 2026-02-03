import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from './base-rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityLoggerService } from '../../utils/security-logger.service';
import { AllConfigType } from '../../../config/config.type';

@Injectable()
export class GlobalRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = 'global';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const globalConfig = this.configService.get('security.rateLimit.global', {
      infer: true,
    });

    this.rateLimitConfig = new RateLimitConfig(
      globalConfig?.ttl || 60,
      globalConfig?.limit || 100,
    );
  }

  protected getIdentifier(request: Request): string {
    return (request as any).realIp || request.ip || '0.0.0.0';
  }
}
