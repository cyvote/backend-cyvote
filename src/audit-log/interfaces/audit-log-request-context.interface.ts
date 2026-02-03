export interface AuditLogRequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  timestamp: Date;
}
