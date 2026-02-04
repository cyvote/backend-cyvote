import { Module, forwardRef } from '@nestjs/common';
import { ElectionScheduleRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { SuperadminElectionController } from './superadmin-election.controller';
import { PublicElectionController } from './public-election.controller';
import { ElectionScheduleService } from './election-schedule.service';
import { ElectionStatusSchedulerService } from './election-status-scheduler.service';
import { ElectionExtensionEmailService } from './election-extension-email.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailModule } from '../mail/mail.module';
import { AdminVotersModule } from '../admin-voters/admin-voters.module';

@Module({
  imports: [
    ElectionScheduleRelationalPersistenceModule,
    AuditLogModule,
    MailModule,
    forwardRef(() => AdminVotersModule),
  ],
  controllers: [SuperadminElectionController, PublicElectionController],
  providers: [
    ElectionScheduleService,
    ElectionStatusSchedulerService,
    ElectionExtensionEmailService,
  ],
  exports: [ElectionScheduleService],
})
export class ElectionScheduleModule {}
