import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a new candidate
 */
export class CreateCandidateDto {
  @ApiProperty({
    description: 'Candidate name',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  nama: string;

  @ApiPropertyOptional({
    description: 'Vision and mission statement (max 2000 characters)',
    example: 'My vision is to...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  visi_misi?: string;

  @ApiPropertyOptional({
    description: 'Work program description (max 3000 characters)',
    example: 'My work program includes...',
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  program_kerja?: string;
}
