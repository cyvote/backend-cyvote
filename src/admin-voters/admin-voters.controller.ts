import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminVotersService } from './admin-voters.service';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { QueryVotersDto } from './dto/query-voters.dto';
import { VoterResponseDto } from './dto/voter-response.dto';
import { PaginatedVotersResponseDto } from './dto/paginated-voters-response.dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';

@ApiTags('Admin Voters')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
@Controller({ path: 'admin/voters', version: '1' })
export class AdminVotersController {
  constructor(private readonly adminVotersService: AdminVotersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new voter' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Voter created successfully',
    type: VoterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'NIM already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid email format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async create(
    @Body() dto: CreateVoterDto,
    @CurrentAdmin('id') adminId: string,
  ): Promise<VoterResponseDto> {
    return this.adminVotersService.create(dto, adminId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List voters with pagination, filtering, and sorting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of voters retrieved successfully',
    type: PaginatedVotersResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async findMany(
    @Query() query: QueryVotersDto,
  ): Promise<PaginatedVotersResponseDto> {
    return this.adminVotersService.findMany(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get voter by ID' })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voter retrieved successfully',
    type: VoterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voter not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VoterResponseDto> {
    return this.adminVotersService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update voter' })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voter updated successfully',
    type: VoterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voter not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'NIM already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Cannot modify voter who has already voted',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoterDto,
    @CurrentAdmin('id') adminId: string,
  ): Promise<VoterResponseDto> {
    return this.adminVotersService.update(id, dto, adminId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete voter' })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Voter deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Voter not found',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Cannot delete voter who has already voted',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin('id') adminId: string,
  ): Promise<void> {
    return this.adminVotersService.softDelete(id, adminId);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore soft-deleted voter' })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voter restored successfully',
    type: VoterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Voter is not deleted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'NIM is already taken by another voter',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin('id') adminId: string,
  ): Promise<VoterResponseDto> {
    return this.adminVotersService.restore(id, adminId);
  }
}
