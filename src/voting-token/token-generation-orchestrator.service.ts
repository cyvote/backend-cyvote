import { Inject, Injectable, Logger } from '@nestjs/common';
import { TokenGenerationService } from './token-generation.service';
import { TokenGenerationRepositoryInterface } from './interfaces/token-generation.repository.interface';
import { ElectionConfigRepositoryInterface } from '../election-schedule/interfaces/election-config.repository.interface';
import {
  ElectionConfig,
  ElectionStatus,
} from '../election-schedule/domain/election-config.model';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { VoterInfo } from './interfaces/token-with-voter.interface';

/**
 * Orchestrator for token generation and email distribution workflows.
 *
 * This service coordinates the entire token lifecycle:
 * 1. Invalidation of stale tokens from previous elections
 * 2. Generation of new tokens for voters
 * 3. Email distribution of tokens to voters
 *
 * Entry points:
 * - onElectionActivated(): called when election transitions SCHEDULED → ACTIVE
 * - onVoterRegisteredDuringActiveElection(): called when a voter is created/restored during ACTIVE
 * - onBulkVotersRegisteredDuringActiveElection(): called when voters are bulk-created during ACTIVE
 * - runCatchUpCheck(): called by catch-up cron to handle missed voters
 */
@Injectable()
export class TokenGenerationOrchestratorService {
  private readonly logger = new Logger(TokenGenerationOrchestratorService.name);

  /**
   * Processing lock to prevent concurrent batch operations.
   * This is a runtime-only guard (NOT persistent state).
   */
  private isBatchProcessing = false;

  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY_MS = 60_000; // 60 seconds between batches

  constructor(
    @Inject('TokenGenerationRepositoryInterface')
    private readonly tokenRepository: TokenGenerationRepositoryInterface,
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Called when election status transitions from SCHEDULED to ACTIVE.
   * Performs full batch: invalidate stale → generate → send emails.
   *
   * This method is fire-and-forget safe (never throws to caller).
   */
  async onElectionActivated(electionConfig: ElectionConfig): Promise<void> {
    if (this.isBatchProcessing) {
      this.logger.warn(
        'Batch token generation already in progress, skipping duplicate trigger',
      );
      return;
    }

    this.isBatchProcessing = true;

    try {
      this.logger.log(
        `Election ${electionConfig.id} activated — starting batch token generation`,
      );

      // Step 1: Invalidate all stale tokens from previous elections
      const invalidatedCount = await this.tokenRepository.invalidateStaleTokens(
        electionConfig.createdAt,
      );

      if (invalidatedCount > 0) {
        this.logger.log(
          `Invalidated ${invalidatedCount} stale tokens from previous election(s)`,
        );

        this.auditLogService.log({
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          action: AuditAction.TOKEN_STALE_INVALIDATED,
          resourceType: AuditResourceType.TOKEN,
          resourceId: electionConfig.id,
          status: AuditStatus.SUCCESS,
          details: {
            invalidatedCount,
            electionId: electionConfig.id,
            electionCreatedAt: electionConfig.createdAt.toISOString(),
          },
        });
      }

      // Step 2: Find all voters that need tokens for this election
      const voters = await this.tokenRepository.findVotersWithoutValidToken(
        electionConfig.createdAt,
      );

      if (voters.length === 0) {
        this.logger.log('No voters need token generation');
        return;
      }

      this.logger.log(
        `Found ${voters.length} voters needing tokens — starting generation and email distribution`,
      );

      // Step 3: Generate tokens and send emails in batches
      const result = await this.generateAndSendInBatches(
        voters,
        electionConfig,
      );

      // Step 4: Log final audit
      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_ELECTION_ACTIVATED_BATCH,
        resourceType: AuditResourceType.TOKEN,
        resourceId: electionConfig.id,
        status: AuditStatus.SUCCESS,
        details: {
          trigger: 'Election status changed to ACTIVE',
          electionId: electionConfig.id,
          staleTokensInvalidated: invalidatedCount,
          tokensGenerated: result.generated,
          emailsSent: result.emailsSent,
          failed: result.failed,
          totalVoters: voters.length,
          batchesProcessed: result.batches,
        },
      });

      this.logger.log(
        `Batch token generation completed: ${result.generated} generated, ` +
          `${result.emailsSent} emails sent, ${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error(
        'Error during batch token generation on election activation',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isBatchProcessing = false;
    }
  }

  /**
   * Called when a single voter is created or restored during ACTIVE election.
   * Generates token and sends email immediately for that voter.
   *
   * Fire-and-forget safe (never throws to caller).
   */
  async onVoterRegisteredDuringActiveElection(
    voterId: string,
    electionConfig: ElectionConfig,
  ): Promise<void> {
    try {
      // Find voter info
      const voter = await this.tokenRepository.findVoterById(voterId);

      if (!voter) {
        this.logger.warn(
          `Voter ${voterId} not found for token generation during active election`,
        );
        return;
      }

      this.logger.log(
        `Generating token for newly registered voter ${voterId} during active election`,
      );

      const result = await this.generateAndSendForSingleVoter(
        voter,
        electionConfig,
      );

      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_VOTER_CREATED_DURING_ELECTION,
        resourceType: AuditResourceType.TOKEN,
        resourceId: voterId,
        status: result.success ? AuditStatus.SUCCESS : AuditStatus.FAILED,
        details: {
          trigger: 'Voter created/restored during ACTIVE election',
          voterId,
          voterNim: voter.nim,
          voterEmail: voter.email,
          tokenGenerated: result.tokenGenerated,
          emailSent: result.emailSent,
          electionId: electionConfig.id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error generating token for voter ${voterId} during active election`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Called when bulk voters are created during ACTIVE election.
   * Generates tokens and sends emails for all provided voters.
   *
   * Fire-and-forget safe (never throws to caller).
   */
  async onBulkVotersRegisteredDuringActiveElection(
    voterIds: string[],
    electionConfig: ElectionConfig,
  ): Promise<void> {
    try {
      if (voterIds.length === 0) {
        return;
      }

      this.logger.log(
        `Generating tokens for ${voterIds.length} bulk-created voters during active election`,
      );

      // Gather voter info for all IDs
      const voters: VoterInfo[] = [];
      for (const voterId of voterIds) {
        const voter = await this.tokenRepository.findVoterById(voterId);
        if (voter) {
          voters.push(voter);
        }
      }

      if (voters.length === 0) {
        this.logger.warn('No valid voters found for bulk token generation');
        return;
      }

      const result = await this.generateAndSendInBatches(
        voters,
        electionConfig,
      );

      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_VOTER_CREATED_DURING_ELECTION,
        resourceType: AuditResourceType.TOKEN,
        status: AuditStatus.SUCCESS,
        details: {
          trigger: 'Bulk voters created during ACTIVE election',
          voterCount: voters.length,
          tokensGenerated: result.generated,
          emailsSent: result.emailsSent,
          failed: result.failed,
          electionId: electionConfig.id,
        },
      });
    } catch (error) {
      this.logger.error(
        'Error during bulk voter token generation',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Catch-up check: finds voters without valid tokens during ACTIVE election
   * and generates + sends tokens for them. Acts as a safety net.
   *
   * Called by the catch-up cron job.
   */
  async runCatchUpCheck(): Promise<void> {
    if (this.isBatchProcessing) {
      this.logger.debug(
        'Batch processing in progress, skipping catch-up check',
      );
      return;
    }

    try {
      // Get current election config
      const config = await this.electionConfigRepository.findCurrentConfig();

      if (!config || config.status !== ElectionStatus.ACTIVE) {
        return;
      }

      // Find voters without valid tokens for the current election
      const voters = await this.tokenRepository.findVotersWithoutValidToken(
        config.createdAt,
      );

      if (voters.length === 0) {
        return;
      }

      this.logger.log(
        `Catch-up: found ${voters.length} voter(s) without valid tokens during ACTIVE election`,
      );

      this.isBatchProcessing = true;

      try {
        const result = await this.generateAndSendInBatches(voters, config);

        this.auditLogService.log({
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          action: AuditAction.TOKEN_BATCH_GENERATED,
          resourceType: AuditResourceType.TOKEN,
          resourceId: config.id,
          status: AuditStatus.SUCCESS,
          details: {
            trigger: 'Catch-up cron detected voters without valid tokens',
            electionId: config.id,
            tokensGenerated: result.generated,
            emailsSent: result.emailsSent,
            failed: result.failed,
            totalVoters: voters.length,
          },
        });
      } finally {
        this.isBatchProcessing = false;
      }
    } catch (error) {
      this.logger.error(
        'Error during catch-up token generation check',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Generate tokens and send emails for a list of voters in batches.
   * Batch size: 50, delay between batches: 60 seconds.
   */
  private async generateAndSendInBatches(
    voters: VoterInfo[],
    electionConfig: ElectionConfig,
  ): Promise<BatchResult> {
    // Pre-format the election end date for all emails
    const endDateFormatted = this.formatDateForEmail(electionConfig.endDate);

    let totalGenerated = 0;
    let totalEmailsSent = 0;
    let totalFailed = 0;

    // Split into batches
    const batches = this.chunkArray(voters, this.BATCH_SIZE);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      this.logger.log(
        `Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} voters)`,
      );

      for (const voter of batch) {
        try {
          const result = await this.generateAndSendForSingleVoter(
            voter,
            electionConfig,
            endDateFormatted,
          );

          if (result.tokenGenerated) {
            totalGenerated++;
          }
          if (result.emailSent) {
            totalEmailsSent++;
          }
          if (!result.success) {
            totalFailed++;
          }
        } catch (error) {
          totalFailed++;
          this.logger.error(
            `Failed to generate/send token for voter ${voter.id}: ${(error as Error).message}`,
          );
        }
      }

      // Delay between batches (except for last batch)
      if (batchIdx < batches.length - 1) {
        this.logger.log(
          `Waiting ${this.BATCH_DELAY_MS / 1000}s before next batch...`,
        );
        await this.sleep(this.BATCH_DELAY_MS);
      }
    }

    return {
      generated: totalGenerated,
      emailsSent: totalEmailsSent,
      failed: totalFailed,
      batches: batches.length,
    };
  }

  /**
   * Generate a token and send email for a single voter.
   * Combines generation + email sending in one atomic flow to avoid
   * generating tokens without sending emails.
   */
  private async generateAndSendForSingleVoter(
    voter: VoterInfo,
    electionConfig: ElectionConfig,
    preFormattedDate?: { date: string; time: string },
  ): Promise<SingleVoterResult> {
    // Generate unique plaintext token
    const plaintextToken =
      await this.tokenGenerationService.generateUniqueToken();

    // Hash the token
    const tokenHash = this.tokenGenerationService.hashToken(plaintextToken);

    // Save to database
    const token = await this.tokenRepository.createToken(voter.id, tokenHash);

    // Format dates for email (use pre-formatted if available for batch efficiency)
    const { date, time } =
      preFormattedDate || this.formatDateForEmail(electionConfig.endDate);

    // Send email
    const emailResult = await this.mailService.sendVotingToken({
      to: voter.email,
      data: {
        nama: voter.namaLengkap,
        nim: voter.nim,
        token: plaintextToken,
        end_date: date,
        end_time: time,
      },
    });

    // Mark as sent if successful
    if (emailResult.success) {
      await this.tokenRepository.markEmailSent(token.id);
    }

    this.logger.debug(
      `Token generated and ${emailResult.success ? 'sent' : 'FAILED to send'} for voter ${voter.id}`,
    );

    return {
      success: emailResult.success,
      tokenGenerated: true,
      emailSent: emailResult.success,
    };
  }

  /**
   * Format date for email template in WIB (UTC+7)
   */
  private formatDateForEmail(date: Date): { date: string; time: string } {
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);

    const dateStr = wibDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

    const timeStr =
      wibDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' WIB';

    return { date: dateStr, time: timeStr };
  }

  /**
   * Split array into chunks of specified size
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Internal result type for batch operations
 */
interface BatchResult {
  generated: number;
  emailsSent: number;
  failed: number;
  batches: number;
}

/**
 * Internal result type for single voter operations
 */
interface SingleVoterResult {
  success: boolean;
  tokenGenerated: boolean;
  emailSent: boolean;
}
