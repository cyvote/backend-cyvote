import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerificationDataDto {
  @ApiProperty({
    description: 'Verification status',
    enum: ['PASS', 'FAIL'],
    example: 'PASS',
  })
  status: 'PASS' | 'FAIL';

  @ApiProperty({
    description: 'Total number of votes verified',
    example: 249,
  })
  totalVerified: number;

  @ApiPropertyOptional({
    description:
      'List of corrupted vote IDs (only present when status is FAIL)',
    type: [String],
    example: ['vote-uuid-1', 'vote-uuid-2'],
  })
  corruptedVotes?: string[];

  @ApiProperty({
    description: 'Timestamp when verification was completed (WIB)',
    example: '2026-02-06T10:30:00+07:00',
  })
  verifiedAt: string;
}

export class VerificationResponseDto {
  @ApiProperty({ type: VerificationDataDto })
  data: VerificationDataDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Verifikasi integritas suara selesai',
  })
  message: string;
}
