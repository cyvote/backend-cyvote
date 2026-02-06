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
 * Vote count per candidate with photo URL for public results
 */
export interface CandidateVoteCountWithPhoto {
  candidateId: string;
  nama: string;
  photoUrl: string | null;
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
   * Get vote counts grouped by candidate with photo URL using LEFT JOIN
   * Returns all active candidates with their vote counts, names, and photo URLs
   * Used by public results endpoint
   */
  getVoteCountsByCandidateWithPhoto(): Promise<CandidateVoteCountWithPhoto[]>;

  /**
   * Get the total number of votes cast
   */
  getTotalVoteCount(): Promise<number>;

  /**
   * Get total number of registered (non-deleted) voters
   * Used to calculate participation rate
   */
  getTotalRegisteredVoters(): Promise<number>;

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
