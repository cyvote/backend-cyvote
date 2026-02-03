import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, now } from 'mongoose';
import { EntityDocumentHelper } from '../../../../../utils/document-entity-helper';
import { AuditAction } from '../../../../enums/audit-action.enum';
import { AuditActorType } from '../../../../enums/audit-actor-type.enum';
import { AuditResourceType } from '../../../../enums/audit-resource-type.enum';
import { AuditStatus } from '../../../../enums/audit-status.enum';

export type AuditLogSchemaDocument = HydratedDocument<AuditLogSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class AuditLogSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
    default: null,
  })
  actorId: string | null;

  @Prop({
    type: String,
    required: true,
    enum: AuditActorType,
  })
  actorType: AuditActorType;

  @Prop({
    type: String,
    required: true,
    enum: AuditAction,
  })
  action: AuditAction;

  @Prop({
    type: String,
    default: null,
    enum: [...Object.values(AuditResourceType), null],
  })
  resourceType: AuditResourceType | null;

  @Prop({
    type: String,
    default: null,
  })
  resourceId: string | null;

  @Prop({
    type: String,
    default: null,
  })
  ipAddress: string | null;

  @Prop({
    type: String,
    default: null,
  })
  userAgent: string | null;

  @Prop({
    type: String,
    required: true,
    enum: AuditStatus,
  })
  status: AuditStatus;

  @Prop({
    type: String,
    required: true,
  })
  message: string;

  @Prop({
    type: Object,
    default: null,
  })
  details: Record<string, any> | null;

  @Prop({ default: now })
  createdAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLogSchemaClass);

// Create indexes
AuditLogSchema.index({ actorId: 1 });
AuditLogSchema.index({ actorType: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ status: 1 });
AuditLogSchema.index({ createdAt: -1 });
