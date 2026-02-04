import { ElectionConfig } from '../../election-schedule/domain/election-config.model';

export interface ElectionConfigRepositoryInterface {
  /**
   * Find the active election configuration
   */
  findActive(): Promise<ElectionConfig | null>;

  /**
   * Check if election status is active
   */
  isElectionActive(): Promise<boolean>;
}
