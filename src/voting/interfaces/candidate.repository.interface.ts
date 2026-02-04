export interface CandidateRepositoryInterface {
  /**
   * Check if a candidate exists by ID
   */
  existsById(id: string): Promise<boolean>;
}
