import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ElectionResultsRepositoryInterface,
  CandidateVoteCount,
  VoteForVerification,
} from '../../../../interfaces/election-results.repository.interface';
import { VoteEntity } from '../../../../../voting/infrastructure/persistence/relational/entities/vote.entity';
import { CandidateEntity } from '../../../../../admin-candidates/infrastructure/persistence/relational/entities/candidate.entity';
import { ElectionConfigEntity } from '../../../../../election-schedule/infrastructure/persistence/relational/entities/election-config.entity';
import {
  ElectionConfig,
  ElectionStatus,
} from '../../../../../election-schedule/domain/election-config.model';

@Injectable()
export class ElectionResultsRepository
  implements ElectionResultsRepositoryInterface
{
  constructor(
    @InjectRepository(VoteEntity)
    private readonly voteRepository: Repository<VoteEntity>,
    @InjectRepository(CandidateEntity)
    private readonly candidateRepository: Repository<CandidateEntity>,
    @InjectRepository(ElectionConfigEntity)
    private readonly electionConfigRepository: Repository<ElectionConfigEntity>,
  ) {}

  /**
   * Get vote counts grouped by candidate using LEFT JOIN
   * Includes all active candidates, even those with 0 votes
   */
  async getVoteCountsByCandidate(): Promise<CandidateVoteCount[]> {
    const results = await this.candidateRepository
      .createQueryBuilder('c')
      .leftJoin(VoteEntity, 'v', 'c.id = v.candidate_id')
      .select('c.id', 'candidateId')
      .addSelect('c.nama', 'candidateName')
      .addSelect('COUNT(v.id)', 'voteCount')
      .where('c.status = :status', { status: 'active' })
      .groupBy('c.id')
      .addGroupBy('c.nama')
      .orderBy('"voteCount"', 'DESC')
      .getRawMany();

    return results.map((r) => ({
      candidateId: r.candidateId,
      candidateName: r.candidateName,
      voteCount: parseInt(r.voteCount, 10) || 0,
    }));
  }

  /**
   * Get total number of votes cast
   */
  async getTotalVoteCount(): Promise<number> {
    return this.voteRepository.count();
  }

  /**
   * Get all votes for hash verification
   * Returns essential fields needed for SHA256 recalculation
   */
  async findAllVotesForVerification(): Promise<VoteForVerification[]> {
    const votes = await this.voteRepository
      .createQueryBuilder('v')
      .select([
        'v.id AS "id"',
        'v.voter_id AS "voterId"',
        'v.candidate_id AS "candidateId"',
        'v.vote_hash AS "voteHash"',
        'v.voted_at AS "votedAt"',
      ])
      .getRawMany();

    return votes.map((v) => ({
      id: v.id,
      voterId: v.voterId,
      candidateId: v.candidateId,
      voteHash: v.voteHash,
      votedAt: new Date(v.votedAt),
    }));
  }

  /**
   * Find the current (most recent) election configuration
   */
  async findCurrentElectionConfig(): Promise<ElectionConfig | null> {
    const entity = await this.electionConfigRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!entity) {
      return null;
    }

    return entity.toDomain();
  }

  /**
   * Update election status to PUBLISHED and set results_published_at timestamp
   */
  async updateElectionToPublished(
    id: string,
    publishedAt: Date,
  ): Promise<void> {
    await this.electionConfigRepository.update(id, {
      status: ElectionStatus.PUBLISHED,
      resultsPublishedAt: publishedAt,
    });
  }
}
