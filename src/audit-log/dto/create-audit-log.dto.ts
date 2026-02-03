import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditActorType } from '../enums/audit-actor-type.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';
import { AuditStatus } from '../enums/audit-status.enum';

export class CreateAuditLogDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID of the actor performing the action',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  actorId: string | null;

  @ApiProperty({
    enum: AuditActorType,
    example: AuditActorType.USER,
    description: 'Type of actor performing the action',
  })
  @IsNotEmpty()
  @IsEnum(AuditActorType)
  actorType: AuditActorType;

  @ApiProperty({
    enum: AuditAction,
    example: AuditAction.VOTE_CAST,
    description: 'Action being performed',
  })
  @IsNotEmpty()
  @IsEnum(AuditAction)
  action: AuditAction;

  @ApiProperty({
    enum: AuditResourceType,
    example: AuditResourceType.VOTE,
    description: 'Type of resource being acted upon',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType | null;

  @ApiProperty({
    type: String,
    example: 'vote-uuid-123',
    description: 'ID of the resource being acted upon',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  resourceId?: string | null;

  @ApiProperty({
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
    description: 'Status of the action',
  })
  @IsNotEmpty()
  @IsEnum(AuditStatus)
  status: AuditStatus;

  @ApiProperty({
    type: Object,
    example: { candidateId: 'candidate-uuid-456' },
    description: 'Additional details about the action',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsObject()
  details?: Record<string, any> | null;
}
