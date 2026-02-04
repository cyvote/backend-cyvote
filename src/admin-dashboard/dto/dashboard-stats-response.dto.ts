import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({
    description: 'Total number of registered voters (excluding deleted)',
    example: 1000,
  })
  totalVoters: number;

  @ApiProperty({
    description: 'Total number of voters who have voted',
    example: 856,
  })
  totalVoted: number;

  @ApiProperty({
    description: 'Total number of voters who have not voted yet',
    example: 144,
  })
  totalNotVoted: number;

  @ApiProperty({
    description: 'Participation rate as percentage with 2 decimal places',
    example: '85.60',
  })
  participationRate: string;
}

export class DashboardStatsResponseDto {
  @ApiProperty({
    type: DashboardStatsDto,
  })
  data: DashboardStatsDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Dashboard stats retrieved successfully',
  })
  message: string;
}
