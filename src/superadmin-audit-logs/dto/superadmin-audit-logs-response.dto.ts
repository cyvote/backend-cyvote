import { ApiProperty } from '@nestjs/swagger';
import { AuditLog } from '../../audit-log/domain/audit-log';

export class SuperadminAuditLogsResponseDto {
  @ApiProperty({
    type: [AuditLog],
    description: 'Array of audit log entries',
  })
  data: AuditLog[];

  @ApiProperty({
    type: Number,
    example: 1234,
    description: 'Total number of logs matching the filters',
  })
  total: number;

  @ApiProperty({
    type: Number,
    example: 1,
    description: 'Current page number',
  })
  page: number;

  @ApiProperty({
    type: Number,
    example: 20,
    description: 'Number of items per page',
  })
  limit: number;

  @ApiProperty({
    type: Number,
    example: 62,
    description: 'Total number of pages',
  })
  totalPages: number;
}
