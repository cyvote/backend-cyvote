import { ApiProperty } from '@nestjs/swagger';

export class BulkVoterErrorDto {
  @ApiProperty({
    description: 'Position in original array (0-based index)',
    example: 0,
  })
  index: number;

  @ApiProperty({
    description: 'NIM of the failed voter',
    example: '2110511001',
  })
  nim: string;

  @ApiProperty({
    description: 'List of validation error messages',
    example: ['A voter with this NIM already exists'],
    type: [String],
  })
  errors: string[];
}

export class BulkCreateSummaryDto {
  @ApiProperty({
    description: 'Total number of voters submitted in the request',
    example: 10,
  })
  totalSubmitted: number;

  @ApiProperty({
    description: 'Number of voters successfully created',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of voters that failed validation',
    example: 2,
  })
  failedCount: number;
}

export class BulkCreateVoterResponseDto {
  @ApiProperty({
    description: 'Summary statistics of the bulk operation',
    type: BulkCreateSummaryDto,
  })
  summary: BulkCreateSummaryDto;

  @ApiProperty({
    description: 'List of failed voter items with error details',
    type: [BulkVoterErrorDto],
  })
  failedItems: BulkVoterErrorDto[];

  @ApiProperty({
    description: 'Human-readable message about the operation result',
    example: 'Bulk import completed: 8 succeeded, 2 failed',
  })
  message: string;
}
