import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenEntity } from '../auth-voter/infrastructure/persistence/relational/entities/token.entity';
import { VoterEntity } from '../auth-voter/infrastructure/persistence/relational/entities/voter.entity';
import { TokenGenerationRepository } from './infrastructure/persistence/relational/token-generation.repository';
import { TokenGenerationService } from './token-generation.service';
import { TokenEmailDistributionService } from './token-email-distribution.service';
import { TokenGenerationSchedulerService } from './token-generation-scheduler.service';
import { TokenGenerationOrchestratorService } from './token-generation-orchestrator.service';
import { AdminResendTokenService } from './admin-resend-token.service';
import { AdminResendTokenController } from './admin-resend-token.controller';
import { AdminResendStatusService } from './admin-resend-status.service';
import { AdminResendStatusController } from './admin-resend-status.controller';
import { AdminResendStatusRateLimitGuard } from './guards/admin-resend-status-rate-limit.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailModule } from '../mail/mail.module';
import { SecurityModule } from '../security/security.module';
import { ElectionScheduleRelationalPersistenceModule } from '../election-schedule/infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, VoterEntity]),
    ScheduleModule,
    AuditLogModule,
    MailModule,
    SecurityModule,
    ElectionScheduleRelationalPersistenceModule,
  ],
  controllers: [AdminResendTokenController, AdminResendStatusController],
  providers: [
    {
      provide: 'TokenGenerationRepositoryInterface',
      useClass: TokenGenerationRepository,
    },
    TokenGenerationService,
    TokenEmailDistributionService,
    TokenGenerationSchedulerService,
    TokenGenerationOrchestratorService,
    AdminResendTokenService,
    AdminResendStatusService,
    AdminResendStatusRateLimitGuard,
  ],
  exports: [
    TokenGenerationService,
    TokenEmailDistributionService,
    TokenGenerationOrchestratorService,
    'TokenGenerationRepositoryInterface',
  ],
})
export class VotingTokenModule {}
