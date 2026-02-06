import { ElectionConfig } from '../../election-schedule/domain/election-config.model';

/**
 * Raw vote count per candidate from database query
 */
export interface CandidateVoteCount {
  candidateId: string;
  candidateName: string;
  voteCount: number;
}

/**
 * Vote data needed for integrity verification
 */
export interface VoteForVerification {
  id: string;
  voterId: string;
  candidateId: string;
  voteHash: string;
  votedAt: Date;
}

/**
 * Repository interface for election results bounded context
 * Following DDD - each bounded context defines its own repository interface
 */
export interface ElectionResultsRepositoryInterface {
  /**
   * Get vote counts grouped by candidate using LEFT JOIN
   * Returns all active candidates with their vote counts (0 if no votes)
   */
  getVoteCountsByCandidate(): Promise<CandidateVoteCount[]>;

  /**
   * Get the total number of votes cast
   */
  getTotalVoteCount(): Promise<number>;

  /**
   * Get all votes with fields needed for hash verification
   */
  findAllVotesForVerification(): Promise<VoteForVerification[]>;

  /**
   * Find the current (most recent) election configuration
   */
  findCurrentElectionConfig(): Promise<ElectionConfig | null>;

  /**
   * Update election status to PUBLISHED and set results_published_at
   */
  updateElectionToPublished(id: string, publishedAt: Date): Promise<void>;
}
