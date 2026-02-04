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
@Controller('api/v1/candidates')
export class CandidatesController {
  constructor(
    private readonly adminCandidatesService: AdminCandidatesService,
  ) {}

  /**
   * Get all candidates with pagination (for voters)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all candidates',
    description:
      'Get paginated list of all candidates. Requires voter authentication (verified token).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of candidates',
    type: PaginatedCandidatesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Voter authentication required',
  })
  async findMany(
    @Query() query: QueryCandidatesDto,
  ): Promise<PaginatedCandidatesResponseDto> {
    return this.adminCandidatesService.findMany(query);
  }

  /**
   * Get single candidate by ID (for voters)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get candidate by ID',
    description:
      'Get detailed information of a single candidate. Requires voter authentication (verified token).',
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
    description: 'Candidate not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Voter authentication required',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SingleCandidateResponseDto> {
    return this.adminCandidatesService.findById(id);
  }
}
