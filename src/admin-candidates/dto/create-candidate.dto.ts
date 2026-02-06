import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CandidateStatus } from '../enums/candidate-status.enum';

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

  @ApiPropertyOptional({
    description: 'Candidate status (active or inactive)',
    enum: CandidateStatus,
    example: CandidateStatus.ACTIVE,
    default: CandidateStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
