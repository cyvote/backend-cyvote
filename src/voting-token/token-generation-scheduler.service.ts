import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenGenerationOrchestratorService } from './token-generation-orchestrator.service';

/**
 * Scheduler service for catch-up token generation.
 *
 * This service acts as a safety net that periodically checks for voters
 * without valid tokens during an ACTIVE election. It handles edge cases such as:
 * - Failed token generation during the primary trigger (election activation)
 * - Race conditions between voter creation and token generation
 * - Any other scenario where a voter might not have received a token
 *
 * The primary trigger is event-driven (election becomes ACTIVE),
 * this cron is the fallback mechanism.
 *
 * Runs every 5 minutes.
 */
@Injectable()
export class TokenGenerationSchedulerService {
  private readonly logger = new Logger(TokenGenerationSchedulerService.name);

  constructor(
    private readonly orchestratorService: TokenGenerationOrchestratorService,
  ) {}

  /**
   * Catch-up cron: every 5 minutes
   * Checks for voters without valid tokens during ACTIVE election.
   * Delegates all logic to the orchestrator service.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCatchUpCheck(): Promise<void> {
    this.logger.debug('Running catch-up token generation check');
    await this.orchestratorService.runCatchUpCheck();
  }
}
