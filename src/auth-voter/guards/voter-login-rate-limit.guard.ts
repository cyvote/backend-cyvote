import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';

/**
 * Rate limit guard for voter login endpoint
 * Limits to 5 attempts per 10 minutes per IP
 */
@Injectable()
export class VoterLoginRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = '/api/v1/auth/voter/login';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService,
  ) {
    super(rateLimitService, logger);

    const loginConfig = this.configService.get<{
      ttl?: number;
      limit?: number;
    }>('security.rateLimit.login');

    // 5 attempts per 600 seconds (10 minutes)
    this.rateLimitConfig = new RateLimitConfig(
      loginConfig?.ttl || 600,
      loginConfig?.limit || 5,
    );
  }

  protected getIdentifier(request: Request): string {
    // Use IP for voter login attempts
    return (request as any).realIp || request.ip || '0.0.0.0';
  }
}
