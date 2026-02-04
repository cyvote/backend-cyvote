import { QueryRunner } from 'typeorm';
import { Voter } from '../../admin-voters/domain/voter';

export interface VoterRepositoryInterface {
  /**
   * Find voter by ID
   */
  findById(id: string): Promise<Voter | null>;

  /**
   * Mark voter as having voted within a transaction
   */
  markAsVoted(
    id: string,
    votedAt: Date,
    queryRunner: QueryRunner,
  ): Promise<void>;
}
