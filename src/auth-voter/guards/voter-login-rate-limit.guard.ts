import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';
import { IpExtractorUtil } from '../../security/utils/ip-extractor.util';

/**
 * Rate limit guard for voter login endpoint
 * Limits to 5 attempts per 10 minutes per NIM (user-specific)
 *
 * Uses NIM (from request body) as the primary identifier to ensure
 * rate limits are isolated per voter. This prevents Docker/proxy
 * environments from sharing rate limit buckets across all users
 * behind the same gateway IP.
 *
 * Falls back to normalized IP for requests without a valid NIM.
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
    // Use NIM from request body as the primary identifier (per-user bucket)
    // Guards run after body-parser, so request.body is available
    const nim = request.body?.nim;

    if (nim && typeof nim === 'string' && nim.trim().length > 0) {
      return `nim:${nim.trim()}`;
    }

    // Fallback to normalized IP for requests without a valid NIM
    const rawIp = (request as any).realIp || request.ip || '0.0.0.0';
    return `ip:${IpExtractorUtil.normalizeIp(rawIp)}`;
  }
}
