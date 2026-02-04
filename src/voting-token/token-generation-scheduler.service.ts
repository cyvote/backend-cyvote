import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenGenerationService } from './token-generation.service';
import { TokenEmailDistributionService } from './token-email-distribution.service';
import { ElectionConfigRepositoryInterface } from '../election-schedule/interfaces/election-config.repository.interface';
import { ElectionStatus } from '../election-schedule/domain/election-config.model';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';

/**
 * Scheduler service for triggering token generation
 * Runs every minute, triggers 10-15 minutes before election start
 */
@Injectable()
export class TokenGenerationSchedulerService {
  private readonly logger = new Logger(TokenGenerationSchedulerService.name);
  private tokenGenerationTriggered = false;

  constructor(
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly tokenGenerationService: TokenGenerationService,
    private readonly tokenEmailDistributionService: TokenEmailDistributionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Cron job: every minute
   * Check if current time is 10-15 minutes before election start_date
   * If yes, trigger token generation + email distribution
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleTokenGenerationTrigger(): Promise<void> {
    try {
      // Skip if already triggered
      if (this.tokenGenerationTriggered) {
        this.logger.debug('Token generation already triggered, skipping');
        return;
      }

      // Get current election config
      const config = await this.electionConfigRepository.findCurrentConfig();

      if (!config) {
        this.logger.debug(
          'No election config found, skipping token generation check',
        );
        return;
      }

      // Only trigger for SCHEDULED elections
      if (config.status !== ElectionStatus.SCHEDULED) {
        this.logger.debug(
          `Election status is ${config.status}, not SCHEDULED. Skipping.`,
        );
        return;
      }

      // Calculate time until start (in minutes)
      const now = new Date();
      const startDate = new Date(config.startDate);
      const minutesUntilStart =
        (startDate.getTime() - now.getTime()) / (1000 * 60);

      this.logger.debug(
        `Minutes until election start: ${minutesUntilStart.toFixed(2)}`,
      );

      // Check if within 10-15 minutes before start
      if (minutesUntilStart > 15 || minutesUntilStart < 10) {
        this.logger.debug(
          `Not within trigger window (10-15 mins). Minutes until start: ${minutesUntilStart.toFixed(2)}`,
        );
        return;
      }

      // Trigger token generation
      this.logger.log('Triggering token generation (10-15 mins before start)');
      this.tokenGenerationTriggered = true;

      // Generate all tokens
      const generationResult =
        await this.tokenGenerationService.generateAllTokens();

      this.logger.log(
        `Token generation result: ${generationResult.generated} generated, ${generationResult.failed} failed`,
      );

      // Schedule token emails
      const emailResult =
        await this.tokenEmailDistributionService.scheduleTokenEmails();

      this.logger.log(
        `Email distribution result: ${emailResult.sent} sent, ${emailResult.failed} failed`,
      );

      // Log audit
      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.SYSTEM,
        action: AuditAction.TOKEN_BATCH_GENERATED,
        resourceType: AuditResourceType.TOKEN,
        status: AuditStatus.SUCCESS,
        details: {
          trigger: 'Scheduled 10-15 mins before election start',
          minutesUntilStart: minutesUntilStart.toFixed(2),
          tokenGeneration: generationResult,
          emailDistribution: emailResult,
        },
      });
    } catch (error) {
      this.logger.error(
        'Error during token generation trigger',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Reset the trigger flag (for testing purposes)
   */
  resetTrigger(): void {
    this.tokenGenerationTriggered = false;
  }

  /**
   * Check if token generation has been triggered
   */
  isTriggered(): boolean {
    return this.tokenGenerationTriggered;
  }
}
