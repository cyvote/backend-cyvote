import { Inject, Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { TokenGenerationRepositoryInterface } from './interfaces/token-generation.repository.interface';
import { TokenWithVoter } from './interfaces/token-with-voter.interface';
import { EmailDistributionResultDto } from './dto/email-distribution-result.dto';
import { MailService } from '../mail/mail.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { ElectionConfigRepositoryInterface } from '../election-schedule/interfaces/election-config.repository.interface';
import { ElectionConfig } from '../election-schedule/domain/election-config.model';

/**
 * Service for distributing voting tokens via email
 */
@Injectable()
export class TokenEmailDistributionService {
  private readonly logger = new Logger(TokenEmailDistributionService.name);
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY_MS = 60000; // 60 seconds
  private readonly MAX_RETRIES = 3;

  constructor(
    @Inject('TokenGenerationRepositoryInterface')
    private readonly tokenRepository: TokenGenerationRepositoryInterface,
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly mailService: MailService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Schedule and send token emails in batches
   * Batch size: 50, Delay: 60 seconds between batches
   * Retry failed: max 3x per email (handled by EmailService)
   */
  async scheduleTokenEmails(): Promise<EmailDistributionResultDto> {
    this.logger.log('Starting token email distribution');

    // Get election config for end_date
    const electionConfig =
      await this.electionConfigRepository.findCurrentConfig();

    if (!electionConfig) {
      this.logger.warn('No election config found, skipping email distribution');
      return { sent: 0, failed: 0, total: 0, batches: 0 };
    }

    // Get all tokens not yet sent
    const tokensNotSent = await this.tokenRepository.findTokensNotSent();

    if (tokensNotSent.length === 0) {
      this.logger.log('No tokens pending email delivery');
      return { sent: 0, failed: 0, total: 0, batches: 0 };
    }

    this.logger.log(
      `Found ${tokensNotSent.length} tokens pending email delivery`,
    );

    // Split into batches
    const batches: TokenWithVoter[][] = [];
    for (let i = 0; i < tokensNotSent.length; i += this.BATCH_SIZE) {
      batches.push(tokensNotSent.slice(i, i + this.BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      this.logger.log(
        `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)`,
      );

      for (const tokenWithVoter of batch) {
        try {
          // We need to generate a new token for email since we only have the hash
          // This is a design issue - we'll need to re-generate
          const plaintextToken = this.generateRandomToken();
          const tokenHash = this.hashToken(plaintextToken);

          // Update the token hash in database (since we're generating new one)
          await this.tokenRepository.replaceToken(
            tokenWithVoter.voter.id,
            tokenHash,
            tokenWithVoter.token.resendCount,
          );

          // Format dates for email
          const { date, time } = this.formatDateForEmail(
            electionConfig.endDate,
          );

          // Send email
          const result = await this.mailService.sendVotingToken({
            to: tokenWithVoter.voter.email,
            data: {
              nama: tokenWithVoter.voter.namaLengkap,
              nim: tokenWithVoter.voter.nim,
              token: plaintextToken,
              end_date: date,
              end_time: time,
            },
          });

          if (result.success) {
            // Mark as sent
            const newToken =
              await this.tokenRepository.findActiveTokenByVoterId(
                tokenWithVoter.voter.id,
              );
            if (newToken) {
              await this.tokenRepository.markEmailSent(newToken.id);
            }
            totalSent++;
            this.logger.debug(`Email sent to ${tokenWithVoter.voter.email}`);
          } else {
            totalFailed++;
            this.logger.error(
              `Failed to send email to ${tokenWithVoter.voter.email}: ${result.error?.message}`,
            );
          }
        } catch (error) {
          totalFailed++;
          this.logger.error(
            `Failed to process token for voter ${tokenWithVoter.voter.id}: ${(error as Error).message}`,
          );
        }
      }

      // Delay between batches (except for last batch)
      if (batchIndex < batches.length - 1) {
        this.logger.log(
          `Waiting ${this.BATCH_DELAY_MS / 1000} seconds before next batch...`,
        );
        await this.sleep(this.BATCH_DELAY_MS);
      }
    }

    // Log audit
    this.auditLogService.log({
      actorId: null,
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.TOKEN_EMAIL_BATCH_SENT,
      resourceType: AuditResourceType.EMAIL,
      status: AuditStatus.SUCCESS,
      details: {
        sent: totalSent,
        failed: totalFailed,
        total: tokensNotSent.length,
        batches: batches.length,
      },
    });

    this.logger.log(
      `Email distribution completed: ${totalSent} sent, ${totalFailed} failed out of ${tokensNotSent.length}`,
    );

    return {
      sent: totalSent,
      failed: totalFailed,
      total: tokensNotSent.length,
      batches: batches.length,
    };
  }

  /**
   * Send single token email directly (for resend)
   * @returns true if sent successfully
   */
  async sendSingleTokenEmail(
    voterId: string,
    plaintextToken: string,
    email: string,
    nama: string,
    nim: string,
  ): Promise<boolean> {
    // Get election config for end_date
    const electionConfig =
      await this.electionConfigRepository.findCurrentConfig();

    if (!electionConfig) {
      this.logger.warn('No election config found');
      return false;
    }

    // Format dates for email
    const { date, time } = this.formatDateForEmail(electionConfig.endDate);

    // Send email
    const result = await this.mailService.sendVotingToken({
      to: email,
      data: {
        nama,
        nim,
        token: plaintextToken,
        end_date: date,
        end_time: time,
      },
    });

    return result.success;
  }

  /**
   * Format date for email template in WIB
   */
  private formatDateForEmail(date: Date): { date: string; time: string } {
    // Format to WIB (UTC+7)
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
   * Generate random 8-character alphanumeric token
   */
  private generateRandomToken(): string {
    const TOKEN_LENGTH = 8;
    const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    const randomBytes = crypto.randomBytes(TOKEN_LENGTH);

    for (let i = 0; i < TOKEN_LENGTH; i++) {
      token += TOKEN_CHARS[randomBytes[i] % TOKEN_CHARS.length];
    }

    return token;
  }

  /**
   * Hash token with SHA-256
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token.toUpperCase())
      .digest('hex');
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
