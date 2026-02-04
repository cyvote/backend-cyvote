import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoteStatusResponseDto {
  @ApiProperty({
    description: 'Whether the voter has already cast their vote',
    example: true,
  })
  hasVoted: boolean;

  @ApiPropertyOptional({
    description: 'Receipt code if voter has voted',
    example: 'VOTE-A1B2C3D4',
  })
  receiptCode?: string;

  constructor(data: Partial<VoteStatusResponseDto> = {}) {
    Object.assign(this, data);
  }
}
