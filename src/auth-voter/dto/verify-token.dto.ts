import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for verify token request
 */
export class VerifyTokenDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  token: string;
}
