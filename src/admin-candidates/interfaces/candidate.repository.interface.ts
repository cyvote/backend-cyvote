import { Candidate } from '../domain/candidate';
import { QueryCandidatesDto } from '../dto/query-candidates.dto';

/**
 * Interface for candidate repository operations
 */
export interface CandidateRepositoryInterface {
  /**
   * Create a new candidate
   */
  create(candidate: Candidate): Promise<Candidate>;

  /**
   * Find candidate by ID
   */
  findById(id: string): Promise<Candidate | null>;

  /**
   * Find many candidates with pagination
   */
  findMany(
    query: QueryCandidatesDto,
  ): Promise<{ data: Candidate[]; total: number }>;

  /**
   * Update candidate by ID
   */
  update(id: string, data: Partial<Candidate>): Promise<Candidate>;

  /**
   * Delete candidate by ID (hard delete)
   */
  delete(id: string): Promise<void>;

  /**
   * Check if candidate with name exists (for duplicate validation)
   */
  existsByName(nama: string, excludeId?: string): Promise<boolean>;
}
