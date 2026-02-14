import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum VoterFilterStatus {
  ALL = 'all',
  VOTED = 'voted',
  NOT_VOTED = 'not-voted',
}

export enum VoterStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
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
  RESEND_COUNT = 'resendCount',
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
      'Filter by soft-delete status (active: non-deleted, inactive: soft-deleted)',
    enum: VoterStatusFilter,
    default: VoterStatusFilter.ACTIVE,
    example: 'active',
  })
  @IsOptional()
  @IsEnum(VoterStatusFilter)
  status?: VoterStatusFilter = VoterStatusFilter.ACTIVE;

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

  @ApiPropertyOptional({
    description:
      'Filter by whether token email has been sent (true: sent, false: not sent)',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  tokenSent?: boolean;

  @ApiPropertyOptional({
    description: 'Filter voters with minimum number of resend attempts',
    example: 1,
    minimum: 0,
    maximum: 3,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  minResends?: number;

  @ApiPropertyOptional({
    description: 'Filter voters with maximum number of resend attempts',
    example: 2,
    minimum: 0,
    maximum: 3,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3)
  maxResends?: number;

  @ApiPropertyOptional({
    description:
      'Filter voters who have/have not reached max resend limit (3 times)',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  resendLimitReached?: boolean;
}
