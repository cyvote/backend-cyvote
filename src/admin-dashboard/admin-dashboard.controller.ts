import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { VoterMonitorQueryDto } from './dto/voter-monitor-query.dto';
import { VoterMonitorResponseDto } from './dto/voter-monitor-response.dto';
import { AdminAuthGuard } from '../auth-admin/guards/admin-auth.guard';
import { AdminRolesGuard } from '../auth-admin/guards/admin-roles.guard';
import { AdminRoles } from '../auth-admin/decorators/admin-roles.decorator';
import { AdminRole } from '../auth-admin/enums/admin-role.enum';
import { CurrentAdmin } from '../auth-admin/decorators/current-admin.decorator';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /**
   * GET /api/v1/admin/dashboard/stats
   * Returns voting statistics for admin dashboard
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voting statistics',
    description:
      'Retrieve dashboard statistics including total voters, voted count, not voted count, and participation rate. Requires admin authentication.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard stats retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async getStats(
    @CurrentAdmin('id') adminId: string,
  ): Promise<DashboardStatsResponseDto> {
    return this.adminDashboardService.getStats(adminId);
  }
}

@ApiTags('Admin Monitoring')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.ADMIN, AdminRole.SUPERADMIN)
@Controller({ path: 'admin/monitor', version: '1' })
export class AdminMonitorController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /**
   * GET /api/v1/admin/monitor/voters
   * Returns paginated voter monitoring data
   */
  @Get('voters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Monitor voters with pagination and filtering',
    description:
      'Retrieve paginated voter list for monitoring purposes. ' +
      'Filter by voting status (all/voted/not-voted). ' +
      'Default sort by name (ascending). ' +
      'DOES NOT include candidate choice for privacy. ' +
      'Requires admin authentication.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Voter monitoring data retrieved successfully',
    type: VoterMonitorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad Request - Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Insufficient permissions',
  })
  async monitorVoters(
    @Query() query: VoterMonitorQueryDto,
    @CurrentAdmin('id') adminId: string,
  ): Promise<VoterMonitorResponseDto> {
    return this.adminDashboardService.monitorVoters(query, adminId);
  }
}
