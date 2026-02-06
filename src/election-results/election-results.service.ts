import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { ElectionResultsRepositoryInterface } from './interfaces/election-results.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { ElectionStatus } from '../election-schedule/domain/election-config.model';
import { CandidateResult } from './domain/candidate-result.model';
import { ElectionResults } from './domain/election-results.model';
import {
  VerificationResult,
  VERIFICATION_STATUS,
  VerificationStatus,
} from './domain/verification-result.model';
import {
  ResultsPreviewResponseDto,
  VerificationResponseDto,
  PublishResponseDto,
} from './dto';
import {
  ElectionResultsErrorCode,
  ElectionNotClosedException,
  ElectionConfigNotFoundException,
  VerificationRequiredException,
  VerificationNotPassedException,
} from './errors';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class ElectionResultsService {
  /**
   * In-memory storage for the last verification result.
   * Resets on server restart — superadmin must re-verify before publishing.
   * This is intentional: re-verification ensures integrity is checked fresh.
   */
  private lastVerificationResult: {
    status: VerificationStatus;
    verifiedAt: Date;
    adminId: string;
  } | null = null;

  constructor(
    @Inject('ElectionResultsRepositoryInterface')
    private readonly resultsRepository: ElectionResultsRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Calculate election results with vote counts and percentages
   *
   * Flow:
   * 1. Fetch current election config
   * 2. Validate election is CLOSED or PUBLISHED
   * 3. Query vote counts per candidate (LEFT JOIN)
   * 4. Calculate percentages
   * 5. Determine winner (handle ties)
   * 6. Return formatted response
   */
  async calculateResults(): Promise<ResultsPreviewResponseDto> {
    // Step 1: Get election config
    const electionConfig =
      await this.resultsRepository.findCurrentElectionConfig();

    if (!electionConfig) {
      throw new ElectionConfigNotFoundException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_CONFIG_NOT_FOUND, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 2: Validate election is CLOSED or PUBLISHED
    if (
      electionConfig.status !== ElectionStatus.CLOSED &&
      electionConfig.status !== ElectionStatus.PUBLISHED
    ) {
      throw new ElectionNotClosedException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_NOT_CLOSED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 3: Query vote counts per candidate
    const candidateVoteCounts =
      await this.resultsRepository.getVoteCountsByCandidate();
    const totalVotes = await this.resultsRepository.getTotalVoteCount();

    // Step 4: Map to domain models and calculate percentages
    const candidateResults = candidateVoteCounts.map(
      (c) =>
        new CandidateResult({
          candidateId: c.candidateId,
          candidateName: c.candidateName,
          voteCount: c.voteCount,
        }),
    );

    const withPercentages = ElectionResults.calculatePercentages(
      candidateResults,
      totalVotes,
    );

    // Step 5: Determine winner
    const { winner, isTie } = ElectionResults.determineWinner(withPercentages);

    const calculatedAt = new Date();

    // Step 6: Build and return response
    return {
      data: {
        candidates: withPercentages.map((c) => ({
          candidateId: c.candidateId,
          candidateName: c.candidateName,
          voteCount: c.voteCount,
          percentage: c.percentage,
        })),
        totalVotes,
        winner: winner
          ? {
              candidateId: winner.candidateId,
              candidateName: winner.candidateName,
              voteCount: winner.voteCount,
              percentage: winner.percentage,
            }
          : null,
        isTie,
        calculatedAt: this.formatToWib(calculatedAt),
      },
      message: this.i18n.t('electionResults.resultsPreview', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Verify integrity of all stored votes by recalculating hashes
   *
   * Flow:
   * 1. Validate election is CLOSED
   * 2. Fetch all votes from database
   * 3. For each vote, recalculate SHA256(voter_uuid + candidate_id + voted_at + salt)
   * 4. Compare with stored vote_hash
   * 5. Store verification status in-memory
   * 6. Log verification action
   * 7. Return verification result
   */
  async verifyVoteIntegrity(adminId: string): Promise<VerificationResponseDto> {
    // Step 1: Validate election is CLOSED
    const electionConfig =
      await this.resultsRepository.findCurrentElectionConfig();

    if (!electionConfig) {
      throw new ElectionConfigNotFoundException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_CONFIG_NOT_FOUND, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (electionConfig.status !== ElectionStatus.CLOSED) {
      throw new ElectionNotClosedException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_NOT_CLOSED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 2: Get voting salt from config
    const salt = this.configService.getOrThrow('voting.salt', { infer: true });

    // Step 3: Fetch all votes for verification
    const votes = await this.resultsRepository.findAllVotesForVerification();

    // Step 4: Verify each vote hash
    const corruptedVoteIds: string[] = [];

    for (const vote of votes) {
      const recalculatedHash = this.generateVoteHash(
        vote.voterId,
        vote.candidateId,
        vote.votedAt,
        salt,
      );

      if (recalculatedHash !== vote.voteHash) {
        corruptedVoteIds.push(vote.id);
      }
    }

    // Step 5: Determine verification status
    const status: VerificationStatus =
      corruptedVoteIds.length === 0
        ? VERIFICATION_STATUS.PASS
        : VERIFICATION_STATUS.FAIL;

    const verifiedAt = new Date();

    const verificationResult = new VerificationResult({
      status,
      totalVerified: votes.length,
      corruptedVotes: corruptedVoteIds,
      verifiedAt,
    });

    // Step 6: Store in-memory for publish validation
    this.lastVerificationResult = {
      status,
      verifiedAt,
      adminId,
    };

    // Step 7: Log verification action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.RESULTS_VERIFIED,
      resourceType: AuditResourceType.RESULTS,
      resourceId: electionConfig.id,
      status:
        status === VERIFICATION_STATUS.PASS
          ? AuditStatus.SUCCESS
          : AuditStatus.FAILED,
      details: {
        totalVerified: votes.length,
        corruptedCount: corruptedVoteIds.length,
        verificationStatus: status,
        ...(corruptedVoteIds.length > 0 && {
          corruptedVoteIds,
        }),
      },
    });

    // Step 8: Build and return response
    const responseData: VerificationResponseDto['data'] = {
      status,
      totalVerified: verificationResult.totalVerified,
      verifiedAt: this.formatToWib(verifiedAt),
    };

    // Only include corruptedVotes when status is FAIL
    if (status === VERIFICATION_STATUS.FAIL) {
      responseData.corruptedVotes = corruptedVoteIds;
    }

    return {
      data: responseData,
      message: this.i18n.t('electionResults.verificationComplete', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Publish election results after verification passes
   *
   * Flow:
   * 1. Validate election is CLOSED
   * 2. Validate verification has been run and status is PASS
   * 3. Update election status to PUBLISHED with timestamp
   * 4. Log publish action
   * 5. Return publish confirmation
   */
  async publishResults(adminId: string): Promise<PublishResponseDto> {
    // Step 1: Get election config
    const electionConfig =
      await this.resultsRepository.findCurrentElectionConfig();

    if (!electionConfig) {
      throw new ElectionConfigNotFoundException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_CONFIG_NOT_FOUND, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 2: Validate election is CLOSED
    if (electionConfig.status !== ElectionStatus.CLOSED) {
      throw new ElectionNotClosedException(
        this.i18n.t(ElectionResultsErrorCode.ELECTION_NOT_CLOSED_FOR_PUBLISH, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 3: Validate verification has been run and passed
    if (!this.lastVerificationResult) {
      throw new VerificationRequiredException(
        this.i18n.t(ElectionResultsErrorCode.VERIFICATION_REQUIRED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (this.lastVerificationResult.status !== VERIFICATION_STATUS.PASS) {
      throw new VerificationNotPassedException(
        this.i18n.t(ElectionResultsErrorCode.VERIFICATION_NOT_PASSED, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Step 4: Update election status to PUBLISHED
    const publishedAt = new Date();

    await this.resultsRepository.updateElectionToPublished(
      electionConfig.id,
      publishedAt,
    );

    // Step 5: Log publish action
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.RESULTS_PUBLISHED,
      resourceType: AuditResourceType.ELECTION_CONFIG,
      resourceId: electionConfig.id,
      status: AuditStatus.SUCCESS,
      details: {
        previousStatus: ElectionStatus.CLOSED,
        newStatus: ElectionStatus.PUBLISHED,
        resultsPublishedAt: publishedAt.toISOString(),
        verifiedBy: this.lastVerificationResult.adminId,
        verifiedAt: this.lastVerificationResult.verifiedAt.toISOString(),
      },
    });

    // Step 6: Clear verification result after publishing
    this.lastVerificationResult = null;

    // Step 7: Return response
    return {
      data: {
        id: electionConfig.id,
        status: ElectionStatus.PUBLISHED,
        resultsPublishedAt: this.formatToWib(publishedAt),
      },
      message: this.i18n.t('electionResults.resultsPublished', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }

  /**
   * Generate SHA256 vote hash for verification
   * Must match the exact algorithm used during vote casting:
   * SHA256(voterId + candidateId + votedAt.toISOString() + salt)
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

  /**
   * Format UTC date to WIB string (ISO 8601 with +07:00 offset)
   * Takes a UTC Date and displays it as Jakarta time (GMT+7)
   */
  private formatToWib(date: Date): string {
    const jakartaOffset = 7 * 60;
    const offsetDate = new Date(date.getTime() + jakartaOffset * 60 * 1000);
    return offsetDate.toISOString().replace('Z', '+07:00');
  }
}
