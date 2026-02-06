import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ElectionResultsService } from './election-results.service';
import { PublicResultsResponseDto } from './dto';
import { PublicResultsRateLimitGuard } from './guards/public-results-rate-limit.guard';

/**
 * Public controller for election results.
 * No authentication required — designed for the user portal homepage.
 * Rate limited by IP to prevent abuse.
 */
@ApiTags('Public - Election Results')
@Controller({ path: 'election', version: '1' })
@UseGuards(PublicResultsRateLimitGuard)
export class PublicResultsController {
  constructor(
    private readonly electionResultsService: ElectionResultsService,
  ) {}

  /**
   * GET /api/v1/election/results
   * Public endpoint to retrieve published election results.
   * Returns { published: false } if results are not yet published.
   * Returns full results with winner, participation rate, and voting period if published.
   */
  @Get('results')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get public election results',
    description:
      'Retrieve published election results for the public homepage. ' +
      'No authentication required. Returns { published: false } if the election results ' +
      'have not been published yet. When published, returns candidate results with vote counts, ' +
      'percentages, winner, participation rate, and voting period.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Election results retrieved. Returns published: false if not yet published, ' +
      'or full results data if published.',
    schema: {
      oneOf: [
        {
          type: 'object',
          properties: { published: { type: 'boolean', example: false } },
        },
        {
          type: 'object',
          properties: {
            published: { type: 'boolean', example: true },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  candidateId: { type: 'string' },
                  nama: { type: 'string' },
                  photo_url: { type: 'string', nullable: true },
                  totalVotes: { type: 'number' },
                  percentage: { type: 'number' },
                },
              },
            },
            winner: {
              type: 'object',
              nullable: true,
              properties: {
                candidateId: { type: 'string' },
                nama: { type: 'string' },
                photo_url: { type: 'string', nullable: true },
              },
            },
            totalVotesCast: { type: 'number' },
            participationRate: { type: 'number' },
            votingPeriod: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
              },
            },
            publishedAt: { type: 'string' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded. Please try again later.',
  })
  async getResults(): Promise<PublicResultsResponseDto> {
    return this.electionResultsService.getPublicResults();
  }
}
