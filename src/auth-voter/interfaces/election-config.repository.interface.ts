import { NullableType } from '../../utils/types/nullable.type';
import { ElectionConfig } from '../domain/election-config.model';

/**
 * Interface for election config repository operations
 */
export interface ElectionConfigRepositoryInterface {
  /**
   * Find the active election configuration
   * @returns ElectionConfig if found, null otherwise
   */
  findActiveElection(): Promise<NullableType<ElectionConfig>>;

  /**
   * Find the latest election configuration
   * @returns ElectionConfig if found, null otherwise
   */
  findLatest(): Promise<NullableType<ElectionConfig>>;
}
