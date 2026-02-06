import { Token } from '../../auth-voter/domain/token.model';
import { TokenWithVoter, VoterInfo } from './token-with-voter.interface';

/**
 * Interface for token generation repository operations
 */
export interface TokenGenerationRepositoryInterface {
  /**
   * Find all active voters without a token
   * @returns Array of voter info for voters who don't have tokens yet
   */
  findVotersWithoutToken(): Promise<VoterInfo[]>;

  /**
   * Find all active voters without a valid token for the current election.
   * A "valid token" is one that is unused (is_used = false) and was generated
   * on or after the election's created_at timestamp.
   * Uses LEFT JOIN to find voters missing valid tokens.
   *
   * @param electionCreatedAt - The current election config's created_at timestamp
   * @returns Array of voter info for voters needing token generation
   */
  findVotersWithoutValidToken(electionCreatedAt: Date): Promise<VoterInfo[]>;

  /**
   * Invalidate all stale tokens that were generated before the current election.
   * Marks them as used so they cannot be reused.
   *
   * @param electionCreatedAt - The current election config's created_at timestamp
   * @returns Number of tokens invalidated
   */
  invalidateStaleTokens(electionCreatedAt: Date): Promise<number>;

  /**
   * Create a new token for a voter
   * @param voterId - The voter's UUID
   * @param tokenHash - The hashed token (SHA-256)
   * @returns The created token
   */
  createToken(voterId: string, tokenHash: string): Promise<Token>;

  /**
   * Check if a token hash already exists in the database
   * @param tokenHash - The hashed token to check
   * @returns True if exists, false otherwise
   */
  existsByTokenHash(tokenHash: string): Promise<boolean>;

  /**
   * Find all tokens that have not been sent via email yet
   * @returns Array of tokens with their associated voter info
   */
  findTokensNotSent(): Promise<TokenWithVoter[]>;

  /**
   * Mark a token as having its email sent
   * @param tokenId - The token's UUID
   */
  markEmailSent(tokenId: string): Promise<void>;

  /**
   * Find the active (not used) token for a voter
   * @param voterId - The voter's UUID
   * @returns The token if found, null otherwise
   */
  findActiveTokenByVoterId(voterId: string): Promise<Token | null>;

  /**
   * Find voter by ID
   * @param voterId - The voter's UUID
   * @returns Voter info if found, null otherwise
   */
  findVoterById(voterId: string): Promise<VoterInfo | null>;

  /**
   * Replace old token with a new one (invalidate old, create new)
   * @param voterId - The voter's UUID
   * @param newTokenHash - The new hashed token
   * @param previousResendCount - The previous resend count to increment
   * @returns The new token
   */
  replaceToken(
    voterId: string,
    newTokenHash: string,
    previousResendCount: number,
  ): Promise<Token>;

  /**
   * Increment the resend count for a token
   * @param tokenId - The token's UUID
   */
  incrementResendCount(tokenId: string): Promise<void>;
}
