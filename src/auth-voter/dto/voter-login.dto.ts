import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for voter login request
 */
export class VoterLoginDto {
  @ApiProperty({
    description: 'Nomor Induk Mahasiswa (NIM)',
    example: '2210512109',
    maxLength: 15,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  nim: string;
}
