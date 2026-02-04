import { Inject, Injectable } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { DashboardRepositoryInterface } from './interfaces/dashboard.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VoterMonitor } from './domain/voter-monitor';
import {
  DashboardStatsResponseDto,
  DashboardStatsDto,
} from './dto/dashboard-stats-response.dto';
import {
  VoterMonitorResponseDto,
  VoterMonitorItemDto,
  VoterMonitorPaginationMetaDto,
} from './dto/voter-monitor-response.dto';
import { VoterMonitorQueryDto } from './dto/voter-monitor-query.dto';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';

@Injectable()
export class AdminDashboardService {
  constructor(
    @Inject('DashboardRepositoryInterface')
    private readonly dashboardRepository: DashboardRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get voting statistics for admin dashboard
   * Returns total voters, voted count, not voted count, and participation rate
   */
  async getStats(adminId: string): Promise<DashboardStatsResponseDto> {
    try {
      // Fetch stats from repository
      const result = await this.dashboardRepository.getVoterStats();

      // Calculate participation rate with 2 decimal places
      const participationRate =
        result.totalVoters > 0
          ? ((result.totalVoted / result.totalVoters) * 100).toFixed(2)
          : '0.00';

      // Create domain object
      const stats: DashboardStatsDto = {
        totalVoters: result.totalVoters,
        totalVoted: result.totalVoted,
        totalNotVoted: result.totalNotVoted,
        participationRate,
      };

      // Log successful audit
      this.auditLogService.log({
        actorId: adminId,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.DASHBOARD_STATS_VIEWED,
        resourceType: AuditResourceType.VOTER,
        resourceId: null,
        status: AuditStatus.SUCCESS,
        details: {
          totalVoters: stats.totalVoters,
          totalVoted: stats.totalVoted,
          totalNotVoted: stats.totalNotVoted,
          participationRate: stats.participationRate,
        },
      });

      return {
        data: stats,
        message: this.i18n.t('adminDashboard.statsRetrieved', {
          lang: I18nContext.current()?.lang,
        }),
      };
    } catch (error) {
      // Log failed audit
      this.auditLogService.log({
        actorId: adminId,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.DASHBOARD_STATS_VIEWED,
        resourceType: AuditResourceType.VOTER,
        resourceId: null,
        status: AuditStatus.FAILED,
        details: {
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Get voter monitoring data with pagination and filtering
   * Returns paginated list of voters with their voting status
   * IMPORTANT: Does NOT include candidate choice (privacy principle)
   */
  async monitorVoters(
    query: VoterMonitorQueryDto,
    adminId: string,
  ): Promise<VoterMonitorResponseDto> {
    try {
      // Set defaults
      const page = query.page || 1;
      const limit = query.limit || 10;
      const filter = query.filter || 'all';

      // Fetch data from repository
      const { data, total } =
        await this.dashboardRepository.findVotersForMonitoring(query);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const meta: VoterMonitorPaginationMetaDto = {
        total,
        page,
        limit,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        filters: {
          status: filter,
        },
      };

      // Map domain objects to DTOs
      const dtoData: VoterMonitorItemDto[] = data.map(
        (voter: VoterMonitor) => ({
          id: voter.id,
          nim: voter.nim,
          namaLengkap: voter.namaLengkap,
          angkatan: voter.angkatan,
          email: voter.email,
          hasVoted: voter.hasVoted,
          votedAt: voter.votedAt,
        }),
      );

      // Log successful audit
      this.auditLogService.log({
        actorId: adminId,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_MONITOR_ACCESSED,
        resourceType: AuditResourceType.VOTER,
        resourceId: null,
        status: AuditStatus.SUCCESS,
        details: {
          filter,
          page,
          limit,
          total,
          resultsCount: data.length,
        },
      });

      return {
        data: dtoData,
        meta,
        message: this.i18n.t('adminDashboard.monitorRetrieved', {
          lang: I18nContext.current()?.lang,
        }),
      };
    } catch (error) {
      // Log failed audit
      this.auditLogService.log({
        actorId: adminId,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.VOTER_MONITOR_ACCESSED,
        resourceType: AuditResourceType.VOTER,
        resourceId: null,
        status: AuditStatus.FAILED,
        details: {
          error: error.message,
          filter: query.filter,
          page: query.page,
          limit: query.limit,
        },
      });

      throw error;
    }
  }
}
