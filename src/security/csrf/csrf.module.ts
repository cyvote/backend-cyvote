import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfService } from './services/csrf.service';
import { CsrfGuard } from './guards/csrf.guard';
import { SecurityAuditLoggerService } from '../utils/security-audit-logger.service';

@Module({
  imports: [ConfigModule],
  providers: [SecurityAuditLoggerService, CsrfService, CsrfGuard],
  exports: [CsrfService, CsrfGuard, SecurityAuditLoggerService],
})
export class CsrfModule {}
