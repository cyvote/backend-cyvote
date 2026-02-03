import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from './base-rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { RateLimitConfig } from '../domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../utils/security-audit-logger.service';
import { AllConfigType } from '../../../config/config.type';

@Injectable()
export class TokenVerificationRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = '/api/v1/auth/refresh';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const tokenConfig = this.configService.get(
      'security.rateLimit.tokenVerify',
      {
        infer: true,
      },
    );

    this.rateLimitConfig = new RateLimitConfig(
      tokenConfig?.ttl || 300,
      tokenConfig?.limit || 3,
    );
  }

  protected getIdentifier(request: Request): string {
    // Try to get session ID first
    const user = (request as any).user;
    const session = (request as any).session;
    const sessionHeader = request.headers['x-session-id'];

    if (user?.sessionId) {
      return `session:${user.sessionId}`;
    }

    if (session?.id) {
      return `session:${session.id}`;
    }

    if (sessionHeader && typeof sessionHeader === 'string') {
      return `session:${sessionHeader}`;
    }

    // Fallback to IP
    const ip = (request as any).realIp || request.ip || '0.0.0.0';
    return `ip:${ip}`;
  }
}
