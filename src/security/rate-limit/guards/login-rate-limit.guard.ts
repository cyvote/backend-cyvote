import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from './base-rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../utils/security-audit-logger.service';
import { AllConfigType } from '../../../config/config.type';

/**
 * Rate limit guard for admin email login endpoint
 * Limits to 5 attempts per 10 minutes per email (user-specific)
 * Falls back to IP-based rate limiting for malformed requests
 */
@Injectable()
export class LoginRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = '/api/v1/auth/email/login';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
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
    // Use email from request body as the primary identifier (per-user bucket)
    // Guards run after body-parser, so request.body is available
    const email = request.body?.email;

    if (email && typeof email === 'string' && email.trim().length > 0) {
      return `email:${email.trim().toLowerCase()}`;
    }

    // Fallback to IP for requests without a valid email
    return `ip:${(request as any).realIp || request.ip || '0.0.0.0'}`;
  }
}
