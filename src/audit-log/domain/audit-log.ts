import { ApiProperty } from '@nestjs/swagger';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditActorType } from '../enums/audit-actor-type.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';
import { AuditStatus } from '../enums/audit-status.enum';
import databaseConfig from '../../database/config/database.config';
import { DatabaseConfig } from '../../database/config/database-config.type';

// <database-block>
const idType = (databaseConfig() as DatabaseConfig).isDocumentDatabase
  ? String
  : Number;
// </database-block>

export class AuditLog {
  @ApiProperty({
    type: idType,
  })
  id: number | string;

  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the actor performing the action',
    nullable: true,
  })
  actorId: string | null;

  @ApiProperty({
    enum: AuditActorType,
    example: AuditActorType.USER,
    description: 'Type of actor performing the action',
  })
  actorType: AuditActorType;

  @ApiProperty({
    enum: AuditAction,
    example: AuditAction.VOTE_CAST,
    description: 'Action being performed',
  })
  action: AuditAction;

  @ApiProperty({
    enum: AuditResourceType,
    example: AuditResourceType.VOTE,
    description: 'Type of resource being acted upon',
    nullable: true,
  })
  resourceType: AuditResourceType | null;

  @ApiProperty({
    type: String,
    example: 'vote-uuid-123',
    description: 'ID of the resource being acted upon',
    nullable: true,
  })
  resourceId: string | null;

  @ApiProperty({
    type: String,
    example: '192.168.1.1',
    description: 'IP address of the request',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiProperty({
    type: String,
    example: 'Mozilla/5.0...',
    description: 'User agent of the request',
    nullable: true,
  })
  userAgent: string | null;

  @ApiProperty({
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
    description: 'Status of the action',
  })
  status: AuditStatus;

  @ApiProperty({
    type: String,
    example:
      'User with ID 123e4567-e89b-12d3-a456-426614174000 has successfully voted!',
    description: 'Human-readable log message',
  })
  message: string;

  @ApiProperty({
    type: Object,
    example: { candidateId: 'candidate-uuid-456' },
    description: 'Additional details about the action',
    nullable: true,
  })
  details: Record<string, any> | null;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T00:00:00Z',
    description: 'Timestamp when the log was created',
  })
  createdAt: Date;
}
