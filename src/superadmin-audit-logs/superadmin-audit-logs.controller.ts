import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SuperadminAuditLogsService } from './superadmin-audit-logs.service';
import { CsvExportService } from './services/csv-export.service';
import {
  SuperadminAuditLogsQueryDto,
  SuperadminAuditLogsResponseDto,
} from './dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';
import { AdminJwtPayload } from '../auth-admin/strategies/types/admin-jwt-payload.type';
import { SuperadminAuditLogsRateLimitGuard } from './guards/superadmin-audit-logs-rate-limit.guard';

@ApiTags('Superadmin - Audit Logs')
@ApiBearerAuth()
@Controller({ path: 'superadmin/logs', version: '1' })
@UseGuards(AdminAuthGuard, AdminRolesGuard, SuperadminAuditLogsRateLimitGuard)
@AdminRoles(AdminRole.SUPERADMIN)
export class SuperadminAuditLogsController {
  constructor(
    private readonly superadminAuditLogsService: SuperadminAuditLogsService,
    private readonly csvExportService: CsvExportService,
  ) {}

  /**
   * GET /api/v1/superadmin/logs
   * Query audit logs with filters and pagination
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query audit logs',
    description:
      'Retrieve paginated audit logs with various filters. Requires SUPERADMIN role. Default sort: created_at DESC.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Audit logs retrieved successfully',
    type: SuperadminAuditLogsResponseDto,
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
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many requests - Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid query parameters',
  })
  async queryLogs(
    @Query() query: SuperadminAuditLogsQueryDto,
    @CurrentAdmin() admin: AdminJwtPayload,
  ): Promise<SuperadminAuditLogsResponseDto> {
    return this.superadminAuditLogsService.queryLogs(query, admin.id);
  }

  /**
   * GET /api/v1/superadmin/logs/export
   * Export audit logs as CSV file
   */
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export audit logs as CSV',
    description:
      'Export audit logs matching the filters as a CSV file download. Applies the same filters as the query endpoint. Maximum 50,000 records. Requires SUPERADMIN role.',
  })
  @ApiQuery({
    name: 'dateFrom',
    type: Date,
    required: false,
    description: 'Filter logs from this date',
  })
  @ApiQuery({
    name: 'dateTo',
    type: Date,
    required: false,
    description: 'Filter logs until this date',
  })
  @ApiQuery({
    name: 'action',
    enum: ['VOTE_CAST', 'LOGIN_SUCCESS', 'LOGIN_FAILED', '...'],
    required: false,
    description: 'Filter by specific action',
  })
  @ApiQuery({
    name: 'actorType',
    enum: ['USER', 'ADMIN', 'SYSTEM', 'ANONYMOUS'],
    required: false,
    description: 'Filter by actor type',
  })
  @ApiQuery({
    name: 'ip',
    type: String,
    required: false,
    description: 'Filter by IP address',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    description: 'Search by actor ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file downloaded successfully',
    headers: {
      'Content-Type': {
        description: 'text/csv; charset=utf-8',
      },
      'Content-Disposition': {
        description: 'attachment; filename="audit-logs-{timestamp}.csv"',
      },
    },
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
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many requests - Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid query parameters',
  })
  async exportLogsAsCSV(
    @Query() query: Omit<SuperadminAuditLogsQueryDto, 'page' | 'limit'>,
    @CurrentAdmin() admin: AdminJwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    // Get logs for export
    const logs = await this.superadminAuditLogsService.getLogsForExport(
      query,
      admin.id,
    );

    // Generate CSV content
    const csvContent = this.csvExportService.generateCsvContent(logs);

    // Generate filename
    const filename = this.csvExportService.generateFilename();

    // Set response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send CSV content
    res.send(csvContent);
  }
}
