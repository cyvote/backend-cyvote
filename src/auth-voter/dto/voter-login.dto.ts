import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for voter login request
 */
export class VoterLoginDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  nim: string;
}
