import { ApiProperty } from '@nestjs/swagger';

export class CandidateResultDto {
  @ApiProperty({
    description: 'Candidate UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  candidateId: string;

  @ApiProperty({
    description: 'Candidate name',
    example: 'John Doe',
  })
  candidateName: string;

  @ApiProperty({
    description: 'Total number of votes received',
    example: 150,
  })
  voteCount: number;

  @ApiProperty({
    description: 'Percentage of total votes (2 decimal places)',
    example: 60.24,
  })
  percentage: number;
}

export class ResultsPreviewDataDto {
  @ApiProperty({
    description: 'List of candidates with their vote counts and percentages',
    type: [CandidateResultDto],
  })
  candidates: CandidateResultDto[];

  @ApiProperty({
    description: 'Total number of votes cast',
    example: 249,
  })
  totalVotes: number;

  @ApiProperty({
    description: 'The winning candidate (null if tie or no votes)',
    type: CandidateResultDto,
    nullable: true,
  })
  winner: CandidateResultDto | null;

  @ApiProperty({
    description: 'Whether there is a tie between top candidates',
    example: false,
  })
  isTie: boolean;

  @ApiProperty({
    description: 'Timestamp when results were calculated (WIB)',
    example: '2026-02-06T10:00:00+07:00',
  })
  calculatedAt: string;
}

export class ResultsPreviewResponseDto {
  @ApiProperty({ type: ResultsPreviewDataDto })
  data: ResultsPreviewDataDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Hasil sementara berhasil dihitung',
  })
  message: string;
}
