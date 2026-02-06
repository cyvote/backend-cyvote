import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ElectionConfigRepositoryInterface } from './interfaces/election-config.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { ElectionStatus } from './domain/election-config.model';
import { TokenGenerationOrchestratorService } from '../voting-token/token-generation-orchestrator.service';

@Injectable()
export class ElectionStatusSchedulerService {
  private readonly logger = new Logger(ElectionStatusSchedulerService.name);

  constructor(
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly tokenGenerationOrchestrator: TokenGenerationOrchestratorService,
  ) {}

  /**
   * Cron job that runs every minute to check and update election status
   * SCHEDULED -> ACTIVE when current time >= start_date
   * ACTIVE -> CLOSED when current time >= end_date
   *
   * When transitioning to ACTIVE, triggers token generation and email distribution
   * via the TokenGenerationOrchestratorService (fire-and-forget).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleStatusTransition(): Promise<void> {
    try {
      // Get current election config
      const config = await this.electionConfigRepository.findCurrentConfig();

      if (!config) {
        this.logger.debug('No election config found, skipping status check');
        return;
      }

      const now = new Date();

      // Check SCHEDULED -> ACTIVE transition
      if (
        config.status === ElectionStatus.SCHEDULED &&
        now.getTime() >= config.startDate.getTime()
      ) {
        this.logger.log(
          `Transitioning election ${config.id} from SCHEDULED to ACTIVE`,
        );

        const updatedConfig = await this.electionConfigRepository.updateStatus(
          config.id,
          ElectionStatus.ACTIVE,
        );

        // Log audit
        this.auditLogService.log({
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          action: AuditAction.ELECTION_STATUS_CHANGED,
          resourceType: AuditResourceType.ELECTION_CONFIG,
          resourceId: config.id,
          status: AuditStatus.SUCCESS,
          details: {
            previousStatus: ElectionStatus.SCHEDULED,
            newStatus: ElectionStatus.ACTIVE,
            reason: 'Automatic transition: start_date reached',
          },
        });

        this.logger.log(
          `Election ${config.id} successfully transitioned to ACTIVE`,
        );

        // Fire-and-forget: trigger token generation and email distribution
        // Uses the updated config which now has ACTIVE status
        this.tokenGenerationOrchestrator
          .onElectionActivated(updatedConfig)
          .catch((error) => {
            this.logger.error(
              'Failed to trigger token generation on election activation',
              error instanceof Error ? error.stack : String(error),
            );
          });

        return;
      }

      // Check ACTIVE -> CLOSED transition
      if (
        config.status === ElectionStatus.ACTIVE &&
        now.getTime() >= config.endDate.getTime()
      ) {
        this.logger.log(
          `Transitioning election ${config.id} from ACTIVE to CLOSED`,
        );

        await this.electionConfigRepository.updateStatus(
          config.id,
          ElectionStatus.CLOSED,
        );

        // Log audit
        this.auditLogService.log({
          actorId: null,
          actorType: AuditActorType.SYSTEM,
          action: AuditAction.ELECTION_STATUS_CHANGED,
          resourceType: AuditResourceType.ELECTION_CONFIG,
          resourceId: config.id,
          status: AuditStatus.SUCCESS,
          details: {
            previousStatus: ElectionStatus.ACTIVE,
            newStatus: ElectionStatus.CLOSED,
            reason: 'Automatic transition: end_date reached',
          },
        });

        this.logger.log(
          `Election ${config.id} successfully transitioned to CLOSED`,
        );
        return;
      }

      this.logger.debug(
        `No status transition needed for election ${config.id} (status: ${config.status})`,
      );
    } catch (error) {
      this.logger.error(
        'Error during election status transition check',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
