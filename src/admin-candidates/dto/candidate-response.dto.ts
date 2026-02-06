import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateStatus } from '../enums/candidate-status.enum';

/**
 * DTO for single candidate response
 */
export class CandidateResponseDto {
  @ApiProperty({
    description: 'Candidate UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Candidate name',
    example: 'John Doe',
  })
  nama: string;

  @ApiProperty({
    description: 'Candidate status (active or inactive)',
    enum: CandidateStatus,
    example: CandidateStatus.ACTIVE,
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Photo URL from Supabase Storage',
    example:
      'https://project.supabase.co/storage/v1/object/public/uploads/candidates_profile_photo/123.jpg',
    nullable: true,
  })
  photo_url: string | null;

  @ApiPropertyOptional({
    description: 'Vision and mission statement',
    example: 'My vision is to...',
    nullable: true,
  })
  visi_misi: string | null;

  @ApiPropertyOptional({
    description: 'Work program description',
    example: 'My work program includes...',
    nullable: true,
  })
  program_kerja: string | null;

  @ApiPropertyOptional({
    description: 'Grand design PDF URL from Supabase Storage',
    example:
      'https://project.supabase.co/storage/v1/object/public/uploads/grand_designs/123.pdf',
    nullable: true,
  })
  grand_design_url: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:00:00.000Z',
  })
  updated_at: Date;
}

/**
 * DTO for single candidate API response wrapper
 */
export class SingleCandidateResponseDto {
  @ApiProperty({
    description: 'Candidate data',
    type: CandidateResponseDto,
  })
  data: CandidateResponseDto;
}
