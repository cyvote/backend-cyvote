import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';
import { AllConfigType } from '../../config/config.type';

/**
 * Rate limit guard for the public election results endpoint.
 * Uses IP-based identification since this endpoint has no authentication.
 * Default: 30 requests per 60 seconds per IP.
 */
@Injectable()
export class PublicResultsRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = 'public-results';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const publicResultsConfig = this.configService.get(
      'security.rateLimit.publicResults',
      { infer: true },
    );

    this.rateLimitConfig = new RateLimitConfig(
      publicResultsConfig?.ttl || 60,
      publicResultsConfig?.limit || 30,
    );
  }

  /**
   * Identify requests by IP address only (no auth available)
   */
  protected getIdentifier(request: Request): string {
    return (request as any).realIp || request.ip || '0.0.0.0';
  }
}
