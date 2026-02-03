import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AuditAction } from '../../audit-log/enums/audit-action.enum';
import { AuditResourceType } from '../../audit-log/enums/audit-resource-type.enum';
import { AuditStatus } from '../../audit-log/enums/audit-status.enum';
import { AuditActorType } from '../../audit-log/enums/audit-actor-type.enum';

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

/**
 * Security logging adapter that uses the existing AuditLog system
 * This ensures all security events are logged consistently with other audit events
 */
@Injectable()
export class SecurityAuditLoggerService {
  constructor(private readonly auditLogService: AuditLogService) {}

  /**
   * Log rate limit exceeded event
   */
  logRateLimitExceeded(details: RateLimitLogDetails): void {
    this.auditLogService.log({
      actorId: details.identifier,
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.RATE_LIMIT_EXCEEDED,
      resourceType: AuditResourceType.SECURITY,
      resourceId: details.endpoint,
      status: AuditStatus.FAILED,
      details: {
        endpoint: details.endpoint,
        limit: details.limit,
        count: details.count,
        retryAfter: details.retryAfter,
        timestamp: details.timestamp,
      },
    });
  }

  /**
   * Log CSRF validation failure
   */
  logCsrfViolation(details: CsrfLogDetails): void {
    this.auditLogService.log({
      actorId: details.sessionId,
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.CSRF_VALIDATION_FAILED,
      resourceType: AuditResourceType.SECURITY,
      resourceId: details.endpoint,
      status: AuditStatus.FAILED,
      details: {
        sessionId: details.sessionId,
        ip: details.ip,
        endpoint: details.endpoint,
        reason: details.reason,
      },
    });
  }

  /**
   * Log IP extraction event (debug level)
   */
  logIpExtraction(ip: string, source: string): void {
    // Only log IP extraction in development/debug mode
    // Use security event for this
    this.auditLogService.log({
      actorId: ip,
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.IP_EXTRACTED,
      resourceType: AuditResourceType.SECURITY,
      resourceId: null,
      status: AuditStatus.SUCCESS,
      details: {
        ip,
        source,
      },
    });
  }

  /**
   * Log general security event
   */
  logSecurityEvent(
    event: string,
    details: object,
    status: AuditStatus = AuditStatus.SUCCESS,
  ): void {
    this.auditLogService.log({
      actorId: 'system',
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.SECURITY_EVENT,
      resourceType: AuditResourceType.SECURITY,
      resourceId: null,
      status,
      details: {
        event,
        ...details,
      },
    });
  }

  /**
   * Wrapper methods for backward compatibility
   * These delegate to AuditLogLoggerService for simple logging
   */
  log(message: string, meta?: object): void {
    this.logSecurityEvent(message, meta ?? {});
  }

  error(message: string, meta?: object): void {
    this.logSecurityEvent(message, meta ?? {}, AuditStatus.FAILED);
  }

  warn(message: string, meta?: object): void {
    this.logSecurityEvent(message, meta ?? {}, AuditStatus.FAILED);
  }

  debug(message: string, meta?: object): void {
    // Debug logs can be omitted or logged as security events
    // For now, we'll log them as success events
    this.logSecurityEvent(message, meta ?? {});
  }

  verbose(message: string, meta?: object): void {
    // Verbose logs can be omitted or logged as security events
    this.logSecurityEvent(message, meta ?? {});
  }
}
