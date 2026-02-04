import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditLogLoggerService } from '../audit-log/audit-log-logger.service';
import { AuditLog } from '../audit-log/domain/audit-log';
import {
  SuperadminAuditLogsQueryDto,
  SuperadminAuditLogsResponseDto,
} from './dto';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';

@Injectable()
export class SuperadminAuditLogsService {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly auditLogger: AuditLogLoggerService,
  ) {}

  /**
   * Query audit logs with filters and pagination
   * @param filters Query filters and pagination parameters
   * @param adminId ID of the superadmin making the request (for audit logging)
   * @returns Paginated audit logs response
   */
  async queryLogs(
    filters: SuperadminAuditLogsQueryDto,
    adminId: string,
  ): Promise<SuperadminAuditLogsResponseDto> {
    // Log superadmin access to audit logs
    this.logSuperadminAccess(adminId, 'QUERY', filters);

    // Convert to AuditLogQueryDto
    const auditLogFilters = filters.toAuditLogQueryDto();

    // Fetch audit logs
    const logs = await this.auditLogService.findMany(auditLogFilters);

    // Get total count
    const total = await this.auditLogService.count({
      actorId: auditLogFilters.actorId,
      actorType: auditLogFilters.actorType,
      action: auditLogFilters.action,
      resourceType: auditLogFilters.resourceType,
      resourceId: auditLogFilters.resourceId,
      status: auditLogFilters.status,
      ipAddress: auditLogFilters.ipAddress,
      createdFrom: auditLogFilters.createdFrom,
      createdTo: auditLogFilters.createdTo,
    });

    // Calculate total pages
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get audit logs for export (without pagination)
   * @param filters Query filters (without page and limit)
   * @param adminId ID of the superadmin making the request (for audit logging)
   * @returns All audit logs matching the filters
   */
  async getLogsForExport(
    filters: Omit<SuperadminAuditLogsQueryDto, 'page' | 'limit'>,
    adminId: string,
  ): Promise<AuditLog[]> {
    // Log superadmin export action
    this.logSuperadminAccess(adminId, 'EXPORT', filters);

    // Create a query DTO with high limit for export
    const exportQueryDto = new SuperadminAuditLogsQueryDto();
    exportQueryDto.dateFrom = filters.dateFrom;
    exportQueryDto.dateTo = filters.dateTo;
    exportQueryDto.action = filters.action;
    exportQueryDto.actorType = filters.actorType;
    exportQueryDto.ip = filters.ip;
    exportQueryDto.search = filters.search;

    // Set high limit for export (50000 records max)
    exportQueryDto.page = 1;
    exportQueryDto.limit = 50000;

    const auditLogFilters = exportQueryDto.toAuditLogQueryDto();

    // Fetch all matching logs
    const logs = await this.auditLogService.findMany(auditLogFilters);

    // Log warning if we hit the limit
    if (logs.length >= 50000) {
      this.auditLogger.warn(
        'Export reached maximum limit of 50000 records. Results may be truncated.',
        {
          adminId,
          filters,
          resultCount: logs.length,
        },
      );
    }

    return logs;
  }

  /**
   * Log superadmin access to audit logs
   * @param adminId ID of the superadmin
   * @param actionType Type of action (QUERY or EXPORT)
   * @param filters Filters applied
   */
  private logSuperadminAccess(
    adminId: string,
    actionType: 'QUERY' | 'EXPORT',
    filters: any,
  ): void {
    const action =
      actionType === 'QUERY'
        ? AuditAction.DASHBOARD_STATS_VIEWED
        : AuditAction.EXPORT_NON_VOTERS;

    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: action,
      resourceType: null,
      resourceId: null,
      status: AuditStatus.SUCCESS,
      details: {
        actionType: `SUPERADMIN_AUDIT_LOGS_${actionType}`,
        filters: this.sanitizeFilters(filters),
      },
    });
  }

  /**
   * Sanitize filters for audit logging (remove undefined values)
   * @param filters Original filters object
   * @returns Sanitized filters object
   */
  private sanitizeFilters(filters: any): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
