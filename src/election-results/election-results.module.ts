import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SuperadminResultsController } from './superadmin-results.controller';
import { ElectionResultsService } from './election-results.service';
import { ElectionResultsRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ElectionResultsRateLimitGuard } from './guards/election-results-rate-limit.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ConfigModule,
    ElectionResultsRelationalPersistenceModule,
    AuditLogModule,
    SecurityModule,
  ],
  controllers: [SuperadminResultsController],
  providers: [ElectionResultsService, ElectionResultsRateLimitGuard],
  exports: [ElectionResultsService],
})
export class ElectionResultsModule {}
