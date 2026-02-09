import { ApiProperty } from '@nestjs/swagger';
import { ElectionStatus } from '../../election-schedule/domain/election-config.model';

export class PublishDataDto {
  @ApiProperty({
    description: 'Election configuration ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Updated election status',
    enum: ElectionStatus,
    example: ElectionStatus.PUBLISHED,
  })
  status: ElectionStatus;

  @ApiProperty({
    description: 'Timestamp when results were published (WIB)',
    example: '2026-02-06T11:00:00+07:00',
  })
  resultsPublishedAt: string;
}

export class PublishResponseDto {
  @ApiProperty({ type: PublishDataDto })
  data: PublishDataDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Hasil pemilihan berhasil dipublikasikan',
  })
  message: string;
}
