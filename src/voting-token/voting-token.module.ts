import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenEntity } from '../auth-voter/infrastructure/persistence/relational/entities/token.entity';
import { VoterEntity } from '../auth-voter/infrastructure/persistence/relational/entities/voter.entity';
import { TokenGenerationRepository } from './infrastructure/persistence/relational/token-generation.repository';
import { TokenGenerationService } from './token-generation.service';
import { TokenEmailDistributionService } from './token-email-distribution.service';
import { TokenGenerationSchedulerService } from './token-generation-scheduler.service';
import { AdminResendTokenService } from './admin-resend-token.service';
import { AdminResendTokenController } from './admin-resend-token.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailModule } from '../mail/mail.module';
import { ElectionScheduleModule } from '../election-schedule/election-schedule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, VoterEntity]),
    ScheduleModule,
    AuditLogModule,
    MailModule,
    forwardRef(() => ElectionScheduleModule),
  ],
  controllers: [AdminResendTokenController],
  providers: [
    {
      provide: 'TokenGenerationRepositoryInterface',
      useClass: TokenGenerationRepository,
    },
    TokenGenerationService,
    TokenEmailDistributionService,
    TokenGenerationSchedulerService,
    AdminResendTokenService,
  ],
  exports: [
    TokenGenerationService,
    TokenEmailDistributionService,
    'TokenGenerationRepositoryInterface',
  ],
})
export class VotingTokenModule {}
