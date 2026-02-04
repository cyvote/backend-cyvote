import { QueryRunner } from 'typeorm';
import { Vote } from '../domain/vote.model';
import { VoteHash } from '../domain/vote-hash.model';

export interface VoteRepositoryInterface {
  /**
   * Find a vote by voter ID
   */
  findByVoterId(voterId: string): Promise<Vote | null>;

  /**
   * Create a vote record
   */
  create(vote: Vote): Promise<Vote>;

  /**
   * Create vote and vote hash within a transaction
   * Used for atomic voting operation
   */
  createWithTransaction(
    vote: Vote,
    voteHash: VoteHash,
    queryRunner: QueryRunner,
  ): Promise<Vote>;
}
