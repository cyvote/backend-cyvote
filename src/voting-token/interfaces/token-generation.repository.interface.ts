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
