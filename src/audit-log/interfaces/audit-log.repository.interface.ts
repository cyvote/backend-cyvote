import { AuditLog } from '../domain/audit-log';
import { AuditLogQueryDto } from '../dto/audit-log-query.dto';

export interface AuditLogRepositoryInterface {
  /**
   * Create new audit log entry
   * @param data - Audit log domain entity
   * @returns Promise<AuditLog>
   */
  create(data: AuditLog): Promise<AuditLog>;

  /**
   * Find multiple audit logs with filters
   * @param filters - Query filters and pagination
   * @returns Promise<AuditLog[]>
   */
  findMany(filters: AuditLogQueryDto): Promise<AuditLog[]>;

  /**
   * Find single audit log by ID
   * @param id - Audit log identifier
   * @returns Promise<AuditLog | null>
   */
  findOne(id: string | number): Promise<AuditLog | null>;

  /**
   * Count total audit logs matching filters
   * @param filters - Query filters (without pagination)
   * @returns Promise<number>
   */
  count(filters: Omit<AuditLogQueryDto, 'page' | 'limit'>): Promise<number>;
}
