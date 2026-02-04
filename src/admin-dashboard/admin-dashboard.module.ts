import { Module } from '@nestjs/common';
import {
  AdminDashboardController,
  AdminMonitorController,
} from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RelationalDashboardPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [AuditLogModule, RelationalDashboardPersistenceModule],
  controllers: [AdminDashboardController, AdminMonitorController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}
