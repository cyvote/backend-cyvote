import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum VoterFilterStatus {
  ALL = 'all',
  VOTED = 'voted',
  NOT_VOTED = 'not-voted',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum VoterSortField {
  NIM = 'nim',
  NAMA_LENGKAP = 'namaLengkap',
  ANGKATAN = 'angkatan',
  EMAIL = 'email',
  HAS_VOTED = 'hasVoted',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class QueryVotersDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search query (searches in nim, nama_lengkap, email)',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by vote status',
    enum: VoterFilterStatus,
    default: VoterFilterStatus.ALL,
  })
  @IsOptional()
  @IsEnum(VoterFilterStatus)
  filter?: VoterFilterStatus = VoterFilterStatus.ALL;

  @ApiPropertyOptional({
    description:
      'Filter by angkatan. Supports: single (2020), range (2018-2022), multiple (2020,2021,2022)',
    example: '2020',
  })
  @IsOptional()
  @IsString()
  angkatan?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: VoterSortField,
    default: VoterSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(VoterSortField)
  sort?: VoterSortField = VoterSortField.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
