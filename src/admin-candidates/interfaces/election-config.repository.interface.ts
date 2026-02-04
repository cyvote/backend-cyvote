/**
 * Interface for election config repository to check voting status
 */
export interface ElectionConfigRepositoryInterface {
  /**
   * Check if voting is currently active
   * @returns true if election status is 'ACTIVE'
   */
  isVotingActive(): Promise<boolean>;
}
