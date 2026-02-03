import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditLogRepositoryInterface } from './interfaces/audit-log.repository.interface';
import { AuditLogLoggerService } from './audit-log-logger.service';
import { AuditLogRequestContextService } from './audit-log-request-context.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog } from './domain/audit-log';
import { AuditAction } from './enums/audit-action.enum';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AllConfigType } from '../config/config.type';
import { NullableType } from '../utils/types/nullable.type';

@Injectable()
export class AuditLogService {
  constructor(
    @Inject('AuditLogRepositoryInterface')
    private readonly auditLogRepository: AuditLogRepositoryInterface,
    private readonly logger: AuditLogLoggerService,
    private readonly requestContextService: AuditLogRequestContextService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /**
   * Main logging method - Async and non-blocking
   * Fire and forget pattern - never throws errors
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    const auditLogConfig = this.configService.get('auditLog', { infer: true });

    // Check if audit logging is enabled
    if (!auditLogConfig?.enabled) {
      return;
    }

    // Use setImmediate to ensure non-blocking behavior
    setImmediate(async () => {
      try {
        // Get request context
        const context = this.requestContextService.getContext();

        // Build message
        const message = this.buildLogMessage(
          dto.action,
          dto.actorId,
          dto.details,
        );

        // Create domain entity
        const auditLog = new AuditLog();
        auditLog.actorId = dto.actorId;
        auditLog.actorType = dto.actorType;
        auditLog.action = dto.action;
        auditLog.resourceType = dto.resourceType || null;
        auditLog.resourceId = dto.resourceId || null;
        auditLog.ipAddress = context?.ipAddress || null;
        auditLog.userAgent = context?.userAgent || null;
        auditLog.status = dto.status;
        auditLog.message = message;
        auditLog.details = this.sanitizeDetails(dto.details);
        auditLog.createdAt = new Date();

        // Log with Winston (async)
        this.logger.log(message, {
          actorId: auditLog.actorId,
          actorType: auditLog.actorType,
          action: auditLog.action,
          resourceType: auditLog.resourceType,
          resourceId: auditLog.resourceId,
          ipAddress: auditLog.ipAddress,
          status: auditLog.status,
          details: auditLog.details,
        });

        // Save to database (async, if enabled)
        if (auditLogConfig?.databaseEnabled) {
          await this.auditLogRepository.create(auditLog);
        }
      } catch (error) {
        // Never throw - just log error
        this.logger.error(
          'Failed to create audit log',
          error instanceof Error ? error.stack : undefined,
          {
            error: error instanceof Error ? error.message : String(error),
            dto,
          },
        );
      }
    });
  }

  /**
   * Query audit logs (for admin/reporting)
   */
  async findMany(filters: AuditLogQueryDto): Promise<AuditLog[]> {
    return this.auditLogRepository.findMany(filters);
  }

  /**
   * Get audit log by ID
   */
  async findOne(id: string | number): Promise<NullableType<AuditLog>> {
    return this.auditLogRepository.findOne(id);
  }

  /**
   * Count total audit logs matching filters
   */
  async count(
    filters: Omit<AuditLogQueryDto, 'page' | 'limit'>,
  ): Promise<number> {
    return this.auditLogRepository.count(filters);
  }

  /**
   * Build human-readable log message based on action
   * Special format for VOTE_CAST: "User with ID {uuid} has successfully voted!"
   */
  private buildLogMessage(
    action: AuditAction,
    actorId: string | null,
    details: Record<string, any> | null | undefined,
  ): string {
    // Special format for VOTE_CAST (LUBERJUDIL)
    if (action === AuditAction.VOTE_CAST) {
      return `User with ID ${actorId || 'unknown'} has successfully voted!`;
    }

    // Generic format for other actions
    const actor = actorId || 'anonymous';
    let message = `Actor ${actor} performed ${action}`;

    // Add resource info if available
    if (details?.resourceType && details?.resourceId) {
      message += ` on ${details.resourceType} ${details.resourceId}`;
    }

    return message;
  }

  /**
   * Sanitize details object to prevent sensitive data logging
   * and limit size to prevent DoS
   */
  private sanitizeDetails(
    details: Record<string, any> | null | undefined,
  ): Record<string, any> | null {
    if (!details) {
      return null;
    }

    try {
      // Clone to avoid mutation
      const sanitized = { ...details };

      // Remove sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'accessToken',
        'refreshToken',
        'privateKey',
        'creditCard',
        'ssn',
        'cvv',
      ];

      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          delete sanitized[field];
        }
      });

      // Limit size - max 10KB
      const stringified = JSON.stringify(sanitized);
      if (stringified.length > 10000) {
        return {
          _truncated: true,
          _originalSize: stringified.length,
          _message: 'Details truncated due to size limit',
        };
      }

      return sanitized;
    } catch (error) {
      // If sanitization fails, return error info
      return {
        _error: 'Failed to sanitize details',
        _errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
