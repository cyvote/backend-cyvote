import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for resend token endpoint
 */
export class ResendTokenResponseDto {
  @ApiProperty({
    description: 'Whether the token was resent successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Token berhasil dikirim ulang',
  })
  message: string;

  @ApiProperty({
    description: 'Current resend count after this operation',
    example: 2,
  })
  resendCount: number;

  @ApiProperty({
    description: 'Remaining resend attempts',
    example: 1,
  })
  remainingResends: number;
}
