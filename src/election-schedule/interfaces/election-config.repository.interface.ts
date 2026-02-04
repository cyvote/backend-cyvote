import {
  ElectionConfig,
  ElectionStatus,
} from '../domain/election-config.model';

export interface ElectionConfigRepositoryInterface {
  /**
   * Create a new election configuration
   */
  create(config: ElectionConfig): Promise<ElectionConfig>;

  /**
   * Find the current (most recent) election configuration
   */
  findCurrentConfig(): Promise<ElectionConfig | null>;

  /**
   * Update election status
   */
  updateStatus(id: string, status: ElectionStatus): Promise<ElectionConfig>;

  /**
   * Update election end date
   */
  updateEndDate(id: string, endDate: Date): Promise<ElectionConfig>;
}
