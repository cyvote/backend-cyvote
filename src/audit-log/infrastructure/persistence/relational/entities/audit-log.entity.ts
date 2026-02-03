import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { AuditAction } from '../../../../enums/audit-action.enum';
import { AuditActorType } from '../../../../enums/audit-actor-type.enum';
import { AuditResourceType } from '../../../../enums/audit-resource-type.enum';
import { AuditStatus } from '../../../../enums/audit-status.enum';

@Entity({
  name: 'audit_log',
})
export class AuditLogEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: String, nullable: true })
  actorId: string | null;

  @Index()
  @Column({ type: String })
  actorType: AuditActorType;

  @Index()
  @Column({ type: String })
  action: AuditAction;

  @Column({ type: String, nullable: true })
  resourceType: AuditResourceType | null;

  @Column({ type: String, nullable: true })
  resourceId: string | null;

  @Column({ type: String, nullable: true, length: 45 })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @Column({ type: String })
  status: AuditStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
