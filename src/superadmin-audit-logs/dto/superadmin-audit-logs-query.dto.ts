import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '../../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../../audit-log/enums/audit-actor-type.enum';
import { AuditLogQueryDto } from '../../audit-log/dto/audit-log-query.dto';

export class SuperadminAuditLogsQueryDto {
  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Page number (starts from 1)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    type: Number,
    example: 20,
    description: 'Number of items per page (max 100)',
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiProperty({
    type: Date,
    example: '2024-01-01T00:00:00Z',
    description: 'Filter logs from this date (inclusive)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiProperty({
    type: Date,
    example: '2024-12-31T23:59:59Z',
    description: 'Filter logs until this date (inclusive)',
    required: false,
  })
  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @ApiProperty({
    enum: AuditAction,
    example: AuditAction.VOTE_CAST,
    description: 'Filter by specific action',
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

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
    type: String,
    example: '192.168.1.1',
    description: 'Filter by IP address',
    required: false,
  })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiProperty({
    type: String,
    example: 'uuid-123-456',
    description: 'Search by actor ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Convert to AuditLogQueryDto used by AuditLogService
   */
  toAuditLogQueryDto(): AuditLogQueryDto {
    const dto = new AuditLogQueryDto();
    dto.page = this.page;
    dto.limit = this.limit;
    dto.createdFrom = this.dateFrom;
    dto.createdTo = this.dateTo;
    dto.action = this.action;
    dto.actorType = this.actorType;
    dto.ipAddress = this.ip;
    dto.actorId = this.search;
    return dto;
  }
}
