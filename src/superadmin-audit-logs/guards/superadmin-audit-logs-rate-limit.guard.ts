import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class SuperadminAuditLogsRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = 'superadmin-audit-logs';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const superadminAuditLogsConfig = this.configService.get(
      'security.rateLimit.superadminAuditLogs',
      { infer: true },
    );

    this.rateLimitConfig = new RateLimitConfig(
      superadminAuditLogsConfig?.ttl || 60,
      superadminAuditLogsConfig?.limit || 30,
    );
  }

  protected getIdentifier(request: Request): string {
    const ip = (request as any).realIp || request.ip || '0.0.0.0';
    const adminId = (request as any).user?.id || 'anonymous';
    return `${ip}:${adminId}`;
  }
}
