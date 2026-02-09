import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { BaseRateLimitGuard } from '../../security/rate-limit/guards/base-rate-limit.guard';
import { RateLimitService } from '../../security/rate-limit/services/rate-limit.service';
import { RateLimitConfig } from '../../security/rate-limit/domain/rate-limit-config';
import { SecurityAuditLoggerService } from '../../security/utils/security-audit-logger.service';
import { IpExtractorUtil } from '../../security/utils/ip-extractor.util';
import { AllConfigType } from '../../config/config.type';

@Injectable()
export class ElectionResultsRateLimitGuard extends BaseRateLimitGuard {
  protected rateLimitConfig: RateLimitConfig;
  protected endpointIdentifier = 'election-results';

  constructor(
    rateLimitService: RateLimitService,
    logger: SecurityAuditLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    super(rateLimitService, logger);

    const electionResultsConfig = this.configService.get(
      'security.rateLimit.electionResults',
      { infer: true },
    );

    this.rateLimitConfig = new RateLimitConfig(
      electionResultsConfig?.ttl || 60,
      electionResultsConfig?.limit || 10,
    );
  }

  protected getIdentifier(request: Request): string {
    const rawIp = (request as any).realIp || request.ip || '0.0.0.0';
    const ip = IpExtractorUtil.normalizeIp(rawIp);
    const adminId = (request as any).user?.id || 'anonymous';
    return `${ip}:${adminId}`;
  }
}
