import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SuperadminResultsController } from './superadmin-results.controller';
import { PublicResultsController } from './public-results.controller';
import { ElectionResultsService } from './election-results.service';
import { ElectionResultsRelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { ElectionResultsRateLimitGuard } from './guards/election-results-rate-limit.guard';
import { PublicResultsRateLimitGuard } from './guards/public-results-rate-limit.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ConfigModule,
    ElectionResultsRelationalPersistenceModule,
    AuditLogModule,
    SecurityModule,
  ],
  controllers: [SuperadminResultsController, PublicResultsController],
  providers: [
    ElectionResultsService,
    ElectionResultsRateLimitGuard,
    PublicResultsRateLimitGuard,
  ],
  exports: [ElectionResultsService],
})
export class ElectionResultsModule {}
