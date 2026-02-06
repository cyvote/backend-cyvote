import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AdminCandidatesService } from './admin-candidates.service';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { SingleCandidateResponseDto } from './dto/candidate-response.dto';
import { PaginatedCandidatesResponseDto } from './dto/paginated-candidates-response.dto';
import { VoterAuthGuard } from './guards/voter-auth.guard';

@ApiTags('Candidates (Public)')
@ApiBearerAuth()
@UseGuards(VoterAuthGuard)
@Controller({ path: 'candidates', version: '1' })
export class CandidatesController {
  constructor(
    private readonly adminCandidatesService: AdminCandidatesService,
  ) {}

  /**
   * Get all active candidates with pagination (for voters)
   * Only candidates with status 'active' are returned
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all active candidates',
    description:
      'Get paginated list of active candidates only. Inactive candidates are not shown. Requires voter authentication (verified token).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active candidates',
    type: PaginatedCandidatesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Voter authentication required',
  })
  async findMany(
    @Query() query: QueryCandidatesDto,
  ): Promise<PaginatedCandidatesResponseDto> {
    return this.adminCandidatesService.findMany(query, true);
  }

  /**
   * Get single active candidate by ID (for voters)
   * Returns 404 if candidate is inactive
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active candidate by ID',
    description:
      'Get detailed information of an active candidate. Returns 404 if candidate is inactive. Requires voter authentication (verified token).',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Candidate UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate details',
    type: SingleCandidateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Candidate not found or inactive',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Voter authentication required',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SingleCandidateResponseDto> {
    return this.adminCandidatesService.findById(id, true);
  }
}
