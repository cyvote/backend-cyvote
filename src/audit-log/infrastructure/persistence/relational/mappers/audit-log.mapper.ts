import { AuditLog } from '../../../../domain/audit-log';
import { AuditLogEntity } from '../entities/audit-log.entity';

export class AuditLogMapper {
  static toDomain(raw: AuditLogEntity): AuditLog {
    const domainEntity = new AuditLog();
    domainEntity.id = raw.id;
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

  static toPersistence(domainEntity: AuditLog): AuditLogEntity {
    const persistenceEntity = new AuditLogEntity();
    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.actorId = domainEntity.actorId;
    persistenceEntity.actorType = domainEntity.actorType;
    persistenceEntity.action = domainEntity.action;
    persistenceEntity.resourceType = domainEntity.resourceType;
    persistenceEntity.resourceId = domainEntity.resourceId;
    persistenceEntity.ipAddress = domainEntity.ipAddress;
    persistenceEntity.userAgent = domainEntity.userAgent;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.message = domainEntity.message;
    persistenceEntity.details = domainEntity.details;
    persistenceEntity.createdAt = domainEntity.createdAt;
    return persistenceEntity;
  }
}
