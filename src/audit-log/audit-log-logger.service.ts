import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class AuditLogLoggerService implements NestLoggerService {
  private readonly logger: winston.Logger;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const auditLogConfig = this.configService.get('auditLog', { infer: true });

    const transports: winston.transport[] = [];

    // Console transport
    if (auditLogConfig?.consoleEnabled) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta, null, 2)
                : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            }),
          ),
        }),
      );
    }

    // File transport with daily rotation
    if (auditLogConfig?.fileEnabled) {
      transports.push(
        new DailyRotateFile({
          filename: `${auditLogConfig.filePath}/audit-log-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: auditLogConfig.maxSize,
          maxFiles: auditLogConfig.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Separate file for errors
        new DailyRotateFile({
          filename: `${auditLogConfig.filePath}/audit-log-error-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxSize: auditLogConfig.maxSize,
          maxFiles: auditLogConfig.maxFiles,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: auditLogConfig?.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: Record<string, any>): void {
    this.logger.info(message, { ...context, service: 'AuditLogService' });
  }

  error(message: string, trace?: string, context?: Record<string, any>): void {
    this.logger.error(message, {
      ...context,
      trace,
      service: 'AuditLogService',
    });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, { ...context, service: 'AuditLogService' });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, { ...context, service: 'AuditLogService' });
  }

  verbose(message: string, context?: Record<string, any>): void {
    this.logger.verbose(message, { ...context, service: 'AuditLogService' });
  }
}
