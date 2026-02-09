import { ApiProperty } from '@nestjs/swagger';

/**
 * Individual candidate result for public display
 */
export class PublicCandidateResultDto {
  @ApiProperty({
    description: 'Candidate UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  candidateId: string;

  @ApiProperty({
    description: 'Candidate name',
    example: 'John Doe',
  })
  nama: string;

  @ApiProperty({
    description: 'Candidate photo URL',
    example: 'https://storage.example.com/photos/candidate1.jpg',
    nullable: true,
  })
  photo_url: string | null;

  @ApiProperty({
    description: 'Total number of votes received',
    example: 150,
  })
  totalVotes: number;

  @ApiProperty({
    description: 'Percentage of total votes (2 decimal places)',
    example: 60.24,
  })
  percentage: number;
}

/**
 * Winner information for public display
 */
export class PublicWinnerDto {
  @ApiProperty({
    description: 'Candidate UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  candidateId: string;

  @ApiProperty({
    description: 'Candidate name',
    example: 'John Doe',
  })
  nama: string;

  @ApiProperty({
    description: 'Candidate photo URL',
    example: 'https://storage.example.com/photos/candidate1.jpg',
    nullable: true,
  })
  photo_url: string | null;
}

/**
 * Voting period start and end dates
 */
export class VotingPeriodDto {
  @ApiProperty({
    description: 'Voting start date (WIB)',
    example: '2026-02-01T08:00:00+07:00',
  })
  start: string;

  @ApiProperty({
    description: 'Voting end date (WIB)',
    example: '2026-02-01T20:00:00+07:00',
  })
  end: string;
}

/**
 * Response when election results are NOT yet published
 */
export class PublicResultsNotPublishedDto {
  @ApiProperty({
    description: 'Whether the election results have been published',
    example: false,
  })
  published: false;
}

/**
 * Response when election results ARE published
 */
export class PublicResultsPublishedDto {
  @ApiProperty({
    description: 'Whether the election results have been published',
    example: true,
  })
  published: true;

  @ApiProperty({
    description:
      'List of candidates with their vote counts, percentages, and photos',
    type: [PublicCandidateResultDto],
  })
  results: PublicCandidateResultDto[];

  @ApiProperty({
    description: 'The winning candidate (null if tie or no votes)',
    type: PublicWinnerDto,
    nullable: true,
  })
  winner: PublicWinnerDto | null;

  @ApiProperty({
    description: 'Total number of votes cast',
    example: 249,
  })
  totalVotesCast: number;

  @ApiProperty({
    description:
      'Participation rate as percentage (totalVotesCast / totalRegisteredVoters * 100)',
    example: 87.5,
  })
  participationRate: number;

  @ApiProperty({
    description: 'Voting period start and end dates',
    type: VotingPeriodDto,
  })
  votingPeriod: VotingPeriodDto;

  @ApiProperty({
    description: 'Timestamp when results were published (WIB)',
    example: '2026-02-06T10:00:00+07:00',
  })
  publishedAt: string;
}

/**
 * Union type for public results response
 */
export type PublicResultsResponseDto =
  | PublicResultsNotPublishedDto
  | PublicResultsPublishedDto;
