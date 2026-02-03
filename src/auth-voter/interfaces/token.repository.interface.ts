import { NullableType } from '../../utils/types/nullable.type';
import { Token } from '../domain/token.model';

/**
 * Interface for token repository operations
 */
export interface TokenRepositoryInterface {
  /**
   * Find token by voter ID and token hash (case-insensitive)
   * @param voterId - The voter's UUID
   * @param tokenHash - The hashed token (SHA-256)
   * @returns Token if found, null otherwise
   */
  findByVoterIdAndHash(
    voterId: string,
    tokenHash: string,
  ): Promise<NullableType<Token>>;

  /**
   * Mark token as used
   * @param id - The token's UUID
   * @returns void
   */
  markAsUsed(id: string): Promise<void>;

  /**
   * Find active (unused) token by voter ID
   * @param voterId - The voter's UUID
   * @returns Token if found, null otherwise
   */
  findActiveByVoterId(voterId: string): Promise<NullableType<Token>>;
}
