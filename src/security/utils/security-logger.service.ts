import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AllConfigType } from '../../config/config.type';

export interface RateLimitLogDetails {
  identifier: string;
  endpoint: string;
  limit: number;
  count: number;
  retryAfter: number;
  timestamp: Date;
}

export interface CsrfLogDetails {
  sessionId: string;
  ip: string;
  endpoint: string;
  reason: string;
}

@Injectable()
export class SecurityLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });
    const workingDirectory = this.configService.get('app.workingDirectory', {
      infer: true,
    });

    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr =
              Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          }),
        ),
      }),
    );

    // File transport with daily rotation for security logs
    if (nodeEnv !== 'test') {
      transports.push(
        new DailyRotateFile({
          filename: `${workingDirectory}/logs/security-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Separate file for errors
        new DailyRotateFile({
          filename: `${workingDirectory}/logs/security-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: nodeEnv === 'production' ? 'info' : 'debug',
      transports,
    });
  }

  log(message: string, meta?: object): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: object): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: object): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: object): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: object): void {
    this.logger.verbose(message, meta);
  }

  logRateLimitExceeded(details: RateLimitLogDetails): void {
    this.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ...details,
    });
  }

  logSecurityEvent(event: string, details: object): void {
    this.log(event, {
      event: 'security_event',
      ...details,
    });
  }

  logCsrfViolation(details: CsrfLogDetails): void {
    this.warn('CSRF validation failed', {
      event: 'csrf_validation_failed',
      ...details,
    });
  }

  logIpExtraction(ip: string, source: string): void {
    this.debug('IP extracted', {
      event: 'ip_extracted',
      ip,
      source,
    });
  }
}
