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
   * @param activeOnly - If true, only return candidate with status 'active'
   */
  findById(id: string, activeOnly?: boolean): Promise<Candidate | null>;

  /**
   * Find many candidates with pagination
   * @param activeOnly - If true, only return candidates with status 'active'
   */
  findMany(
    query: QueryCandidatesDto,
    activeOnly?: boolean,
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
