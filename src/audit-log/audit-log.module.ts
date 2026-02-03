import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditLogService } from './audit-log.service';
import { AuditLogLoggerService } from './audit-log-logger.service';
import { AuditLogRequestContextService } from './audit-log-request-context.service';
import { RelationalAuditLogPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentAuditLogPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentAuditLogPersistenceModule
  : RelationalAuditLogPersistenceModule;
// </database-block>

@Global()
@Module({
  imports: [ConfigModule, infrastructurePersistenceModule],
  providers: [
    AuditLogService,
    AuditLogLoggerService,
    AuditLogRequestContextService,
  ],
  exports: [
    AuditLogService,
    AuditLogLoggerService,
    AuditLogRequestContextService,
  ],
})
export class AuditLogModule {}
