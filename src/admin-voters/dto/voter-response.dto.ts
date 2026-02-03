import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoterResponseDto {
  @ApiProperty({
    description: 'Unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'NIM (Nomor Induk Mahasiswa)',
    example: '2110511001',
  })
  nim: string;

  @ApiProperty({
    description: 'Full name of the voter',
    example: 'John Doe',
  })
  namaLengkap: string;

  @ApiProperty({
    description: 'Academic year (angkatan)',
    example: 2021,
  })
  angkatan: number;

  @ApiProperty({
    description: 'Email address',
    example: '2110511001@mahasiswa.upnvj.ac.id',
  })
  email: string;

  @ApiProperty({
    description: 'Whether the voter has already voted',
    example: false,
  })
  hasVoted: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when the voter voted',
    example: '2024-01-15T10:30:00.000Z',
    nullable: true,
  })
  votedAt: Date | null;

  @ApiProperty({
    description: 'Timestamp when the voter was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the voter was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class SingleVoterResponseDto {
  @ApiProperty({
    description: 'Voter data',
    type: VoterResponseDto,
  })
  data: VoterResponseDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Voter retrieved successfully',
  })
  message: string;
}

export class DeleteVoterResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Voter deleted successfully',
  })
  message: string;
}
