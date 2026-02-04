import { ApiProperty } from '@nestjs/swagger';

/**
 * Result of token generation process
 */
export class TokenGenerationResultDto {
  @ApiProperty({
    description: 'Number of tokens successfully generated',
    example: 150,
  })
  generated: number;

  @ApiProperty({
    description: 'Number of failed token generations',
    example: 0,
  })
  failed: number;

  @ApiProperty({
    description: 'Total voters processed',
    example: 150,
  })
  total: number;
}
