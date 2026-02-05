import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoterResponseDto } from './voter-response.dto';

export class FiltersMetaDto {
  @ApiPropertyOptional({
    description: 'Status filter applied',
    example: 'all',
  })
  status?: string;

  @ApiPropertyOptional({
    description:
      'Deletion status filter applied (active: non-deleted, inactive: soft-deleted)',
    example: 'active',
  })
  deletionStatus?: string;

  @ApiPropertyOptional({
    description: 'Search keyword applied',
    example: 'keyword',
  })
  search?: string;

  @ApiPropertyOptional({
    description: 'Angkatan filter applied',
    example: '2021',
  })
  angkatan?: string;

  @ApiPropertyOptional({
    description: 'Sort field applied',
    example: 'createdAt',
  })
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sort order applied',
    example: 'desc',
  })
  order?: string;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;

  @ApiPropertyOptional({
    description: 'Applied filters',
    type: FiltersMetaDto,
  })
  filters?: FiltersMetaDto;
}

export class PaginatedVotersResponseDto {
  @ApiProperty({
    description: 'Array of voters',
    type: [VoterResponseDto],
  })
  data: VoterResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Voters retrieved successfully',
  })
  message: string;
}
