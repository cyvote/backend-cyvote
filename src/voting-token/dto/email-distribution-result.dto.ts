import { ApiProperty } from '@nestjs/swagger';

/**
 * Result of email distribution process
 */
export class EmailDistributionResultDto {
  @ApiProperty({
    description: 'Number of emails successfully sent',
    example: 150,
  })
  sent: number;

  @ApiProperty({
    description: 'Number of failed email sends',
    example: 2,
  })
  failed: number;

  @ApiProperty({
    description: 'Total emails processed',
    example: 152,
  })
  total: number;

  @ApiProperty({
    description: 'Number of batches processed',
    example: 4,
  })
  batches: number;
}
