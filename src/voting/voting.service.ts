import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import crypto from 'node:crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { CastVoteDto } from './dto/cast-vote.dto';
import { VoteResponseDto } from './dto/vote-response.dto';
import { VoteStatusResponseDto } from './dto/vote-status-response.dto';
import { Vote } from './domain/vote.model';
import { VoteHash } from './domain/vote-hash.model';
import { VoteRepositoryInterface } from './interfaces/vote.repository.interface';
import { CandidateRepositoryInterface } from './interfaces/candidate.repository.interface';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { VoterRepositoryInterface } from './interfaces/voter.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { VotingErrorCode } from './errors/voting.errors';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class VotingService {
  constructor(
    @Inject('VoteRepositoryInterface')
    private readonly voteRepository: VoteRepositoryInterface,
    @Inject('CandidateRepositoryInterface')
    private readonly candidateRepository: CandidateRepositoryInterface,
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    @Inject('VoterRepositoryInterface')
    private readonly voterRepository: VoterRepositoryInterface,
    private readonly dataSource: DataSource,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Cast a vote for a candidate
   * Performs validation chain and atomic transaction
   */
  async castVote(voterId: string, dto: CastVoteDto): Promise<VoteResponseDto> {
    const { candidateId } = dto;

    // Validation 1: Election status must be ACTIVE
    const isActive = await this.electionConfigRepository.isElectionActive();
    if (!isActive) {
      throw new ForbiddenException(
        this.i18n.t(VotingErrorCode.ELECTION_NOT_ACTIVE, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Validation 2: Candidate must exist
    const candidateExists =
      await this.candidateRepository.existsById(candidateId);
    if (!candidateExists) {
      throw new NotFoundException(
        this.i18n.t(VotingErrorCode.CANDIDATE_NOT_FOUND, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Validation 3: Voter must exist and not have voted yet
    const voter = await this.voterRepository.findById(voterId);
    if (!voter) {
      throw new NotFoundException(
        this.i18n.t(VotingErrorCode.VOTER_NOT_FOUND, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (voter.hasVoted) {
      throw new ConflictException(
        this.i18n.t(VotingErrorCode.ALREADY_VOTED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Execute voting in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const votedAt = new Date();
      const salt = this.configService.getOrThrow('voting.salt', {
        infer: true,
      });

      // Generate vote hash: SHA256(voter_uuid + candidate_id + timestamp + salt)
      const voteHash = this.generateVoteHash(
        voterId,
        candidateId,
        votedAt,
        salt,
      );

      // Generate receipt code: VOTE-{first 8 chars of hash}
      const receiptCode = Vote.generateReceiptCode(voteHash);

      // Create vote domain object
      const vote = new Vote({
        voterId,
        candidateId,
        voteHash,
        votedAt,
        receiptCode,
      });

      // Create vote hash domain object
      const voteHashRecord = new VoteHash({
        hash: voteHash,
        verificationHash: null,
        createdAt: votedAt,
      });

      // Insert vote and vote hash
      await this.voteRepository.createWithTransaction(
        vote,
        voteHashRecord,
        queryRunner,
      );

      // Update voter: has_voted = true, voted_at = now()
      await this.voterRepository.markAsVoted(voterId, votedAt, queryRunner);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Log success - ONLY "User with ID {uuid} has successfully voted!" (LUBERJUDIL)
      // Do NOT log candidate_id
      this.auditLogService.log({
        actorId: voterId,
        actorType: AuditActorType.USER,
        action: AuditAction.VOTE_CAST,
        resourceType: AuditResourceType.VOTER,
        resourceId: voterId,
        status: AuditStatus.SUCCESS,
        details: {
          // Intentionally NOT including candidateId for LUBERJUDIL compliance
          votedAt: votedAt.toISOString(),
        },
      });

      return new VoteResponseDto({ receiptCode });
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();

      // Log failure
      this.auditLogService.log({
        actorId: voterId,
        actorType: AuditActorType.USER,
        action: AuditAction.VOTE_CAST,
        resourceType: AuditResourceType.VOTER,
        resourceId: voterId,
        status: AuditStatus.FAILED,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // If it's already a known exception, re-throw it
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // Check for unique constraint violation (double vote attempt)
      if (
        error instanceof Error &&
        error.message.includes('UQ_votes_voter_id')
      ) {
        throw new ConflictException(
          this.i18n.t(VotingErrorCode.ALREADY_VOTED, {
            lang: I18nContext.current()?.lang,
          }),
        );
      }

      throw new InternalServerErrorException(
        this.i18n.t(VotingErrorCode.VOTE_FAILED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get vote status for a voter
   */
  async getVoteStatus(voterId: string): Promise<VoteStatusResponseDto> {
    // Check if election is active
    const isActive = await this.electionConfigRepository.isElectionActive();
    if (!isActive) {
      throw new ForbiddenException(
        this.i18n.t(VotingErrorCode.ELECTION_NOT_ACTIVE, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Find existing vote
    const vote = await this.voteRepository.findByVoterId(voterId);

    if (!vote) {
      return new VoteStatusResponseDto({ hasVoted: false });
    }

    return new VoteStatusResponseDto({
      hasVoted: true,
      receiptCode: vote.receiptCode,
    });
  }

  /**
   * Generate vote hash using SHA256
   * Format: SHA256(voter_uuid + candidate_id + timestamp + salt)
   */
  private generateVoteHash(
    voterId: string,
    candidateId: string,
    votedAt: Date,
    salt: string,
  ): string {
    const data = `${voterId}${candidateId}${votedAt.toISOString()}${salt}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
