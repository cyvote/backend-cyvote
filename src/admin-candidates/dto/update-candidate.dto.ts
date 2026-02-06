import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CandidateStatus } from '../enums/candidate-status.enum';

/**
 * DTO for updating a candidate
 */
export class UpdateCandidateDto {
  @ApiPropertyOptional({
    description: 'Candidate name',
    example: 'John Doe Updated',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nama?: string;

  @ApiPropertyOptional({
    description: 'Vision and mission statement (max 2000 characters)',
    example: 'Updated vision is to...',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  visi_misi?: string;

  @ApiPropertyOptional({
    description: 'Work program description (max 3000 characters)',
    example: 'Updated work program includes...',
    maxLength: 3000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  program_kerja?: string;

  @ApiPropertyOptional({
    description: 'Candidate status (active or inactive)',
    enum: CandidateStatus,
    example: CandidateStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
