import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';

export enum VoterMonitorFilter {
  ALL = 'all',
  VOTED = 'voted',
  NOT_VOTED = 'not-voted',
}

export class VoterMonitorQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter voters by voting status',
    enum: VoterMonitorFilter,
    default: VoterMonitorFilter.ALL,
    example: VoterMonitorFilter.NOT_VOTED,
  })
  @IsOptional()
  @IsEnum(VoterMonitorFilter)
  filter?: VoterMonitorFilter = VoterMonitorFilter.ALL;
}
