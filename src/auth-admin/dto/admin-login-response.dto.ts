import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginResponseDto {
  @ApiProperty({
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  token: string;

  @ApiProperty({
    type: Number,
    example: 1707055200000,
    description: 'Token expiration timestamp in milliseconds',
  })
  tokenExpires: number;
}
