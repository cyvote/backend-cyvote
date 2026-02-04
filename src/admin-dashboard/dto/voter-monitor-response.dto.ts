import { ApiProperty } from '@nestjs/swagger';

export class VoterMonitorItemDto {
  @ApiProperty({
    description: 'Voter UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Student ID number (NIM)',
    example: '2110511001',
  })
  nim: string;

  @ApiProperty({
    description: 'Full name of the voter',
    example: 'Ahmad Rizki Maulana',
  })
  namaLengkap: string;

  @ApiProperty({
    description: 'Year of enrollment (angkatan)',
    example: 2021,
  })
  angkatan: number;

  @ApiProperty({
    description: 'Email address',
    example: 'ahmad.rizki@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether the voter has voted',
    example: false,
  })
  hasVoted: boolean;

  @ApiProperty({
    description: 'Timestamp when the voter voted (null if not voted)',
    example: null,
    nullable: true,
  })
  votedAt: Date | null;
}

export class VoterMonitorFiltersMetaDto {
  @ApiProperty({
    description: 'Current filter status',
    example: 'not-voted',
  })
  status: string;
}

export class VoterMonitorPaginationMetaDto {
  @ApiProperty({
    description: 'Total number of items',
    example: 144,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Applied filters',
    type: VoterMonitorFiltersMetaDto,
  })
  filters: VoterMonitorFiltersMetaDto;
}

export class VoterMonitorResponseDto {
  @ApiProperty({
    description: 'Array of voter monitoring data',
    type: [VoterMonitorItemDto],
  })
  data: VoterMonitorItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: VoterMonitorPaginationMetaDto,
  })
  meta: VoterMonitorPaginationMetaDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Voter monitoring data retrieved successfully',
  })
  message: string;
}
