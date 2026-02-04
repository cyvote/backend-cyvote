import { ApiProperty } from '@nestjs/swagger';

export class VoteResponseDto {
  @ApiProperty({
    description: 'Receipt code for the vote',
    example: 'VOTE-A1B2C3D4',
  })
  receiptCode: string;

  constructor(data: Partial<VoteResponseDto> = {}) {
    Object.assign(this, data);
  }
}
