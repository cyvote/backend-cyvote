import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for verify token request
 */
export class VerifyTokenDto {
  @ApiProperty({
    description: 'Voting token received via email (case-insensitive)',
    example: 'ABC123XYZ789TEST',
    minLength: 6,
    maxLength: 64,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  token: string;
}
