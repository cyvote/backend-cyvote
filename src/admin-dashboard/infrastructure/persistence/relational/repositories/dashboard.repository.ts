import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoterEntity } from '../../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import {
  DashboardRepositoryInterface,
  VoterStatsResult,
} from '../../../../interfaces/dashboard.repository.interface';
import { VoterMonitor } from '../../../../domain/voter-monitor';
import {
  VoterMonitorQueryDto,
  VoterMonitorFilter,
} from '../../../../dto/voter-monitor-query.dto';
import { DashboardMapper } from '../mappers/dashboard.mapper';

@Injectable()
export class DashboardRepository implements DashboardRepositoryInterface {
  constructor(
    @InjectRepository(VoterEntity)
    private readonly voterRepository: Repository<VoterEntity>,
  ) {}

  /**
   * Get voter statistics in a single optimized query
   * Uses PostgreSQL's FILTER clause for efficient counting
   */
  async getVoterStats(): Promise<VoterStatsResult> {
    const result = await this.voterRepository
      .createQueryBuilder('voter')
      .select([
        'COUNT(*) FILTER (WHERE voter.deleted_at IS NULL) as "totalVoters"',
        'COUNT(*) FILTER (WHERE voter.has_voted = true AND voter.deleted_at IS NULL) as "totalVoted"',
        'COUNT(*) FILTER (WHERE voter.has_voted = false AND voter.deleted_at IS NULL) as "totalNotVoted"',
      ])
      .getRawOne();

    return {
      totalVoters: Number.parseInt(result.totalVoters, 10) || 0,
      totalVoted: Number.parseInt(result.totalVoted, 10) || 0,
      totalNotVoted: Number.parseInt(result.totalNotVoted, 10) || 0,
    };
  }

  /**
   * Find voters for monitoring with filtering and pagination
   * IMPORTANT: Does NOT include candidate choice for privacy
   * Uses existing indexes for optimal performance
   */
  async findVotersForMonitoring(
    query: VoterMonitorQueryDto,
  ): Promise<{ data: VoterMonitor[]; total: number }> {
    const { page = 1, limit = 10, filter = VoterMonitorFilter.ALL } = query;

    const queryBuilder = this.voterRepository.createQueryBuilder('voter');

    // Base filter: exclude soft-deleted voters
    queryBuilder.where('voter.deleted_at IS NULL');

    // Apply vote status filter
    if (filter === VoterMonitorFilter.VOTED) {
      queryBuilder.andWhere('voter.has_voted = :hasVoted', { hasVoted: true });
    } else if (filter === VoterMonitorFilter.NOT_VOTED) {
      queryBuilder.andWhere('voter.has_voted = :hasVoted', { hasVoted: false });
    }
    // filter === 'all': no additional filtering

    // Select only required columns (privacy: no candidate data)
    queryBuilder.select([
      'voter.id',
      'voter.nim',
      'voter.namaLengkap',
      'voter.angkatan',
      'voter.email',
      'voter.hasVoted',
      'voter.votedAt',
    ]);

    // Default sort: nama_lengkap ASC as per requirements
    queryBuilder.orderBy('voter.namaLengkap', 'ASC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query with count
    const [entities, total] = await queryBuilder.getManyAndCount();

    // Map entities to domain objects
    const data = entities.map((entity) =>
      DashboardMapper.toVoterMonitorDomain(entity),
    );

    return { data, total };
  }
}
