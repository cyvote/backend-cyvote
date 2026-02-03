import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { AllConfigType } from '../../config/config.type';
import { IpExtractorUtil } from '../utils/ip-extractor.util';
import { SecurityAuditLoggerService } from '../utils/security-audit-logger.service';

@Injectable()
export class IpExtractorMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly logger: SecurityAuditLoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      const ipConfig = this.configService.get('security.ipExtraction', {
        infer: true,
      });

      if (!ipConfig) {
        this.logger.warn('IP extraction config not found, using fallback');
        (req as any).realIp = req.ip || '0.0.0.0';
        next();
        return;
      }

      const realIp = IpExtractorUtil.extractRealIp(req, ipConfig);
      (req as any).realIp = realIp;

      this.logger.debug(`IP extracted: ${realIp}`, {
        trustProxy: ipConfig.trustProxy,
        proxyHeaders: ipConfig.proxyHeaders,
      });

      next();
    } catch (error) {
      // On error, set a fallback IP and continue
      this.logger.error('Error extracting IP', { error });
      (req as any).realIp = req.ip || '0.0.0.0';
      next();
    }
  }
}
