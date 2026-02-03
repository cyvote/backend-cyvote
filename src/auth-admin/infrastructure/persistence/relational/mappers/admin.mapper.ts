import { Admin } from '../../../../domain/admin';
import { AdminEntity } from '../entities/admin.entity';

export class AdminMapper {
  static toDomain(raw: AdminEntity): Admin {
    const admin = new Admin();
    admin.id = raw.id;
    admin.username = raw.username;
    admin.passwordHash = raw.passwordHash;
    admin.role = raw.role;
    admin.createdAt = raw.createdAt;
    admin.lastLogin = raw.lastLogin;
    return admin;
  }

  static toEntity(domain: Admin): AdminEntity {
    const entity = new AdminEntity();
    entity.id = domain.id;
    entity.username = domain.username;
    entity.passwordHash = domain.passwordHash;
    entity.role = domain.role;
    entity.createdAt = domain.createdAt;
    entity.lastLogin = domain.lastLogin;
    return entity;
  }
}
