import { ApiProperty } from '@nestjs/swagger';
import { ElectionStatus } from '../domain/election-config.model';

export class ElectionConfigResponseDto {
  @ApiProperty({
    description: 'Election configuration ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Start date in WIB timezone',
    example: '2026-02-10T08:00:00+07:00',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in WIB timezone',
    example: '2026-02-10T17:00:00+07:00',
  })
  endDate: string;

  @ApiProperty({
    description: 'Current election status',
    enum: ElectionStatus,
    example: ElectionStatus.SCHEDULED,
  })
  status: ElectionStatus;

  @ApiProperty({
    description: 'ID of admin who created the config',
    nullable: true,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  createdBy: string | null;

  @ApiProperty({
    description: 'Creation timestamp in WIB timezone',
    example: '2026-02-04T10:00:00+07:00',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp in WIB timezone',
    example: '2026-02-04T10:00:00+07:00',
  })
  updatedAt: string;
}

export class SingleElectionConfigResponseDto {
  @ApiProperty({ type: ElectionConfigResponseDto })
  data: ElectionConfigResponseDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Election schedule created successfully',
  })
  message: string;
}

export class PublicElectionStatusDto {
  @ApiProperty({
    description: 'Current election status',
    enum: ElectionStatus,
    example: ElectionStatus.ACTIVE,
  })
  status: ElectionStatus;

  @ApiProperty({
    description: 'Start date in WIB timezone',
    example: '2026-02-10T08:00:00+07:00',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in WIB timezone',
    example: '2026-02-10T17:00:00+07:00',
  })
  endDate: string;

  @ApiProperty({
    description: 'Whether voting is currently open',
    example: true,
  })
  isVotingOpen: boolean;
}

export class PublicElectionStatusResponseDto {
  @ApiProperty({ type: PublicElectionStatusDto })
  data: PublicElectionStatusDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Election status retrieved',
  })
  message: string;
}
