import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { VotingService } from './voting.service';
import { CastVoteDto } from './dto/cast-vote.dto';
import { VoteResponseDto } from './dto/vote-response.dto';
import { VoteStatusResponseDto } from './dto/vote-status-response.dto';
import { VoterAuthGuard } from './guards/voter-auth.guard';
import { GlobalRateLimitGuard } from '../security/rate-limit/guards/global-rate-limit.guard';

@ApiTags('Voting')
@Controller('api/v1/vote')
@UseGuards(VoterAuthGuard, GlobalRateLimitGuard)
@ApiBearerAuth()
export class VotingController {
  constructor(private readonly votingService: VotingService) {}

  /**
   * Cast a vote for a candidate
   * POST /api/v1/vote
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cast a vote for a candidate',
    description:
      'Submit vote for a candidate. Requires authenticated voter (JWT from verify-token). ' +
      'Election must be ACTIVE. Voter must not have already voted. ' +
      'Returns a receipt code upon successful voting.',
  })
  @ApiBody({ type: CastVoteDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote cast successfully. Returns receipt code.',
    type: VoteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'JWT invalid or expired.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Election is not active.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Candidate not found.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Voter has already voted.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded.',
  })
  async castVote(
    @Body() dto: CastVoteDto,
    @Req() req: Request,
  ): Promise<VoteResponseDto> {
    const voterId = (req as any).user.voterId;
    return this.votingService.castVote(voterId, dto);
  }

  /**
   * Get vote status for authenticated voter
   * GET /api/v1/vote/status
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get vote status',
    description:
      'Check if the authenticated voter has already voted. ' +
      'Election must be ACTIVE. Returns hasVoted status and receipt code if voted.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote status retrieved successfully.',
    type: VoteStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'JWT invalid or expired.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Election is not active.',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded.',
  })
  async getVoteStatus(@Req() req: Request): Promise<VoteStatusResponseDto> {
    const voterId = (req as any).user.voterId;
    return this.votingService.getVoteStatus(voterId);
  }
}
