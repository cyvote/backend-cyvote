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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminVotersService } from './admin-voters.service';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { QueryVotersDto } from './dto/query-voters.dto';
import { BulkCreateVoterDto } from './dto/bulk-create-voter.dto';
import { BulkCreateVoterResponseDto } from './dto/bulk-create-voter-response.dto';
import {
  SingleVoterResponseDto,
  DeleteVoterResponseDto,
} from './dto/voter-response.dto';
import { PaginatedVotersResponseDto } from './dto/paginated-voters-response.dto';
import { ExportNonVotersErrorResponseDto } from './dto/export-non-voters-response.dto';
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
    type: SingleVoterResponseDto,
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
  ): Promise<SingleVoterResponseDto> {
    return this.adminVotersService.create(dto, adminId);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Bulk create voters',
    description:
      'Create multiple voters in a single request. Minimum 2, maximum 500 voters per request. ' +
      'Uses partial success behavior: valid voters are created, invalid ones are returned with error details.',
  })
  @ApiBody({
    type: BulkCreateVoterDto,
    description: 'Array of voters to create (2-500 items)',
    examples: {
      valid: {
        summary: 'Valid bulk request',
        value: {
          voters: [
            {
              nim: '2110511001',
              namaLengkap: 'John Doe',
              angkatan: 2021,
              email: '2110511001@mahasiswa.upnvj.ac.id',
            },
            {
              nim: '2110511002',
              namaLengkap: 'Jane Doe',
              angkatan: 2021,
              email: '2110511002@mahasiswa.upnvj.ac.id',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk import completed (may include partial failures)',
    type: BulkCreateVoterResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Validation error (less than 2 voters, more than 500, or invalid data)',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async bulkCreate(
    @Body() dto: BulkCreateVoterDto,
    @CurrentAdmin('id') adminId: string,
  ): Promise<BulkCreateVoterResponseDto> {
    return this.adminVotersService.bulkCreate(dto, adminId);
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
    type: SingleVoterResponseDto,
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
  ): Promise<SingleVoterResponseDto> {
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
    type: SingleVoterResponseDto,
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
  ): Promise<SingleVoterResponseDto> {
    return this.adminVotersService.update(id, dto, adminId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete voter' })
  @ApiParam({
    name: 'id',
    description: 'Voter UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voter deleted successfully',
    type: DeleteVoterResponseDto,
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
  ): Promise<DeleteVoterResponseDto> {
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
    type: SingleVoterResponseDto,
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
  ): Promise<SingleVoterResponseDto> {
    return this.adminVotersService.restore(id, adminId);
  }

  @Get('export/non-voters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export non-voters as CSV file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file with non-voters data',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No non-voters found',
    type: ExportNonVotersErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async exportNonVoters(
    @CurrentAdmin('id') adminId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { csv, filename } =
      await this.adminVotersService.exportNonVoters(adminId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
