import { VoterMonitor } from '../domain/voter-monitor';
import { VoterMonitorQueryDto } from '../dto/voter-monitor-query.dto';

export interface VoterStatsResult {
  totalVoters: number;
  totalVoted: number;
  totalNotVoted: number;
}

export interface DashboardRepositoryInterface {
  getVoterStats(): Promise<VoterStatsResult>;
  findVotersForMonitoring(
    query: VoterMonitorQueryDto,
  ): Promise<{ data: VoterMonitor[]; total: number }>;
}
