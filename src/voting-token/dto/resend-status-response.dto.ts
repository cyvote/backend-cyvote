import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for resend status endpoint
 * Returns the current token resend count and remaining resend attempts for a voter
 */
export class ResendStatusResponseDto {
  @ApiProperty({
    description: 'The UUID of the voter',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    type: String,
  })
  voterId: string;

  @ApiProperty({
    description:
      'Number of times the token has been resent for this voter (0 = never resent)',
    example: 2,
    type: Number,
    minimum: 0,
    maximum: 3,
  })
  resendCount: number;

  @ApiProperty({
    description:
      'Number of remaining resend attempts available (maximum 3 total resends allowed)',
    example: 1,
    type: Number,
    minimum: 0,
    maximum: 3,
  })
  remainingResends: number;
}
