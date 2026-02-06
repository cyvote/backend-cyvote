import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ElectionResultsService } from './election-results.service';
import {
  ResultsPreviewResponseDto,
  VerificationResponseDto,
  PublishResponseDto,
} from './dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';
import { AdminJwtPayload } from '../auth-admin/strategies/types/admin-jwt-payload.type';
import { ElectionResultsRateLimitGuard } from './guards/election-results-rate-limit.guard';

@ApiTags('Superadmin - Election Results')
@ApiBearerAuth()
@Controller({ path: 'superadmin/results', version: '1' })
@UseGuards(AdminAuthGuard, AdminRolesGuard, ElectionResultsRateLimitGuard)
@AdminRoles(AdminRole.SUPERADMIN)
export class SuperadminResultsController {
  constructor(
    private readonly electionResultsService: ElectionResultsService,
  ) {}

  /**
   * GET /api/v1/superadmin/results/preview
   * Calculate and return election results preview
   */
  @Get('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview election results',
    description:
      'Calculate and return election results including vote counts per candidate, ' +
      'percentages, and winner determination. Only accessible when election status is CLOSED or PUBLISHED. ' +
      'Requires SUPERADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Election results calculated successfully',
    type: ResultsPreviewResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Election is not in CLOSED status',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No election configuration found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async previewResults(): Promise<ResultsPreviewResponseDto> {
    return this.electionResultsService.calculateResults();
  }

  /**
   * POST /api/v1/superadmin/results/verify
   * Verify integrity of all stored votes
   */
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify vote integrity',
    description:
      'Verify the integrity of all stored votes by recalculating SHA256 hashes. ' +
      'For each vote, recalculates SHA256(voter_uuid + candidate_id + voted_at + salt) and compares ' +
      'with the stored vote_hash. Returns PASS if all hashes match, FAIL with corrupted vote IDs otherwise. ' +
      'Only accessible when election status is CLOSED. Requires SUPERADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vote integrity verification completed',
    type: VerificationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Election is not in CLOSED status',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No election configuration found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async verifyResults(
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<VerificationResponseDto> {
    return this.electionResultsService.verifyVoteIntegrity(admin.id);
  }

  /**
   * POST /api/v1/superadmin/results/publish
   * Publish election results after verification
   */
  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish election results',
    description:
      'Publish the election results to make them publicly available. ' +
      'Prerequisites: election must be CLOSED and vote hash verification must have been ' +
      'run with a PASS result. Updates election status to PUBLISHED and sets results_published_at timestamp. ' +
      'Requires SUPERADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Election results published successfully',
    type: PublishResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Election not CLOSED, verification not run, or verification failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - SUPERADMIN role required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No election configuration found',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async publishResults(
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<PublishResponseDto> {
    return this.electionResultsService.publishResults(admin.id);
  }
}
