import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { AuditAction } from '../enums/audit-action.enum';
import { AuditActorType } from '../enums/audit-actor-type.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';
import { AuditStatus } from '../enums/audit-status.enum';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @ApiProperty({
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by actor ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiProperty({
    enum: AuditActorType,
    example: AuditActorType.USER,
    description: 'Filter by actor type',
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditActorType)
  actorType?: AuditActorType;

  @ApiProperty({
    enum: AuditAction,
    example: AuditAction.VOTE_CAST,
    description: 'Filter by action',
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiProperty({
    enum: AuditResourceType,
    example: AuditResourceType.VOTE,
    description: 'Filter by resource type',
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType;

  @ApiProperty({
    type: String,
    example: 'vote-uuid-123',
    description: 'Filter by resource ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiProperty({
    enum: AuditStatus,
    example: AuditStatus.SUCCESS,
    description: 'Filter by status',
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @ApiProperty({
    type: String,
    example: '192.168.1.1',
    description: 'Filter by IP address',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T00:00:00Z',
    description: 'Filter by created date (from)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  createdFrom?: Date;

  @ApiProperty({
    type: Date,
    example: '2024-12-31T23:59:59Z',
    description: 'Filter by created date (to)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  createdTo?: Date;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Page number (1-based)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    type: Number,
    example: 20,
    description: 'Number of items per page',
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
