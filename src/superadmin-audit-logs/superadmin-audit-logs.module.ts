import { Module } from '@nestjs/common';
import { SuperadminAuditLogsController } from './superadmin-audit-logs.controller';
import { SuperadminAuditLogsService } from './superadmin-audit-logs.service';
import { CsvExportService } from './services/csv-export.service';
import { SuperadminAuditLogsRateLimitGuard } from './guards/superadmin-audit-logs-rate-limit.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    AuditLogModule, // For AuditLogService and AuditLogLoggerService
    SecurityModule, // For rate limiting (RateLimitService, SecurityAuditLoggerService)
  ],
  controllers: [SuperadminAuditLogsController],
  providers: [
    SuperadminAuditLogsService,
    CsvExportService,
    SuperadminAuditLogsRateLimitGuard,
  ],
  exports: [], // No exports needed - this is a standalone feature module
})
export class SuperadminAuditLogsModule {}
