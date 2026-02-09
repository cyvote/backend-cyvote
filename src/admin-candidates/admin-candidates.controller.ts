import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminCandidatesService } from './admin-candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { SingleCandidateResponseDto } from './dto/candidate-response.dto';
import { PaginatedCandidatesResponseDto } from './dto/paginated-candidates-response.dto';
import { DeleteCandidateResponseDto } from './dto/delete-candidate-response.dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';

@ApiTags('Admin Candidates')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
@Controller({ path: 'admin/candidates', version: '1' })
export class AdminCandidatesController {
  constructor(
    private readonly adminCandidatesService: AdminCandidatesService,
  ) {}

  /**
   * Create a new candidate with optional file uploads
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'grand_design', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Create a new candidate',
    description:
      'Create a new candidate with optional photo (max 2MB, JPG/PNG) and grand design PDF (max 10MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nama'],
      properties: {
        nama: { type: 'string', maxLength: 100, description: 'Candidate name' },
        visi_misi: {
          type: 'string',
          maxLength: 2000,
          description: 'Vision and mission',
        },
        program_kerja: {
          type: 'string',
          maxLength: 3000,
          description: 'Work program',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          default: 'active',
          description: 'Candidate status (active or inactive)',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file (max 2MB, JPG/PNG)',
        },
        grand_design: {
          type: 'string',
          format: 'binary',
          description: 'Grand design PDF (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Candidate created successfully',
    type: SingleCandidateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type, size exceeded, or invalid status value',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Candidate with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin authentication required',
  })
  async create(
    @Body() dto: CreateCandidateDto,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      grand_design?: Express.Multer.File[];
    },
    @CurrentAdmin('id') adminId: string,
  ): Promise<SingleCandidateResponseDto> {
    return this.adminCandidatesService.create(dto, files || {}, adminId);
  }

  /**
   * Get all candidates with pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all candidates',
    description: 'Get paginated list of all candidates with optional search',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of candidates',
    type: PaginatedCandidatesResponseDto,
  })
  async findMany(
    @Query() query: QueryCandidatesDto,
  ): Promise<PaginatedCandidatesResponseDto> {
    return this.adminCandidatesService.findMany(query);
  }

  /**
   * Get single candidate by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get candidate by ID',
    description: 'Get detailed information of a single candidate',
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
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SingleCandidateResponseDto> {
    return this.adminCandidatesService.findById(id);
  }

  /**
   * Update candidate by ID
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'grand_design', maxCount: 1 },
    ]),
  )
  @ApiOperation({
    summary: 'Update candidate',
    description:
      'Update candidate information. Cannot update while voting is active.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Candidate UUID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nama: { type: 'string', maxLength: 100, description: 'Candidate name' },
        visi_misi: {
          type: 'string',
          maxLength: 2000,
          description: 'Vision and mission',
        },
        program_kerja: {
          type: 'string',
          maxLength: 3000,
          description: 'Work program',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Candidate status (active or inactive)',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file (max 2MB, JPG/PNG)',
        },
        grand_design: {
          type: 'string',
          format: 'binary',
          description: 'Grand design PDF (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate updated successfully',
    type: SingleCandidateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Candidate not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot modify candidate while voting is active',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCandidateDto,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      grand_design?: Express.Multer.File[];
    },
    @CurrentAdmin('id') adminId: string,
  ): Promise<SingleCandidateResponseDto> {
    return this.adminCandidatesService.update(id, dto, files || {}, adminId);
  }

  /**
   * Delete candidate by ID
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete candidate',
    description:
      'Delete a candidate and its associated files. Cannot delete while voting is active.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Candidate UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Candidate deleted successfully',
    type: DeleteCandidateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Candidate not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Cannot delete candidate while voting is active',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin('id') adminId: string,
  ): Promise<DeleteCandidateResponseDto> {
    return this.adminCandidatesService.delete(id, adminId);
  }
}
