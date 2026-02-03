import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogSchemaClass } from '../entities/audit-log.schema';

export class AuditLogMapper {
  static toDomain(raw: AuditLogSchemaClass): AuditLog {
    const domainEntity = new AuditLog();
    domainEntity.id = raw._id.toString();
    domainEntity.actorId = raw.actorId;
    domainEntity.actorType = raw.actorType;
    domainEntity.action = raw.action;
    domainEntity.resourceType = raw.resourceType;
    domainEntity.resourceId = raw.resourceId;
    domainEntity.ipAddress = raw.ipAddress;
    domainEntity.userAgent = raw.userAgent;
    domainEntity.status = raw.status;
    domainEntity.message = raw.message;
    domainEntity.details = raw.details;
    domainEntity.createdAt = raw.createdAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: AuditLog): AuditLogSchemaClass {
    const persistenceSchema = new AuditLogSchemaClass();
    if (domainEntity.id && typeof domainEntity.id === 'string') {
      persistenceSchema._id = domainEntity.id;
    }
    persistenceSchema.actorId = domainEntity.actorId;
    persistenceSchema.actorType = domainEntity.actorType;
    persistenceSchema.action = domainEntity.action;
    persistenceSchema.resourceType = domainEntity.resourceType;
    persistenceSchema.resourceId = domainEntity.resourceId;
    persistenceSchema.ipAddress = domainEntity.ipAddress;
    persistenceSchema.userAgent = domainEntity.userAgent;
    persistenceSchema.status = domainEntity.status;
    persistenceSchema.message = domainEntity.message;
    persistenceSchema.details = domainEntity.details;
    persistenceSchema.createdAt = domainEntity.createdAt;
    return persistenceSchema;
  }
}
