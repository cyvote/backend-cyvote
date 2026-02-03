import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for verify token response
 * Returns an authenticated JWT session token for voting
 */
export class VerifyTokenResponseDto {
  @ApiProperty({
    description:
      'Authenticated JWT for voting. Use this token to cast your vote.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Token expiration timestamp (Unix epoch in milliseconds)',
    example: 1707057600000,
  })
  tokenExpires: number;
}
