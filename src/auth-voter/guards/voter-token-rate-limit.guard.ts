import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';

/**
 * Rate limit guard for voter token verification endpoint
 * Limits to 3 attempts per 60 seconds (1 minute) per session
 */
@Injectable()
export class VoterTokenRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = '/api/v1/auth/voter/verify-token';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService,
  ) {
    super(rateLimitService, logger);

    const tokenConfig = this.configService.get<{
      ttl?: number;
      limit?: number;
    }>('security.rateLimit.tokenVerify');

    // 3 attempts per 60 seconds (1 minute)
    this.rateLimitConfig = new RateLimitConfig(
      tokenConfig?.ttl || 60,
      tokenConfig?.limit || 3,
    );
  }

  protected getIdentifier(request: Request): string {
    // Try to get voter ID from JWT payload first
    const user = (request as any).user;
    const sessionHeader = request.headers['x-session-id'];

    if (user?.voterId) {
      return `voter:${user.voterId}`;
    }

    if (sessionHeader && typeof sessionHeader === 'string') {
      return `session:${sessionHeader}`;
    }

    // Fallback to IP
    const ip = (request as any).realIp || request.ip || '0.0.0.0';
    return `ip:${ip}`;
  }
}
