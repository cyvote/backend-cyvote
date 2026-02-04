import { Module } from '@nestjs/common';
import { AdminVotersController } from './admin-voters.controller';
import { AdminVotersService } from './admin-voters.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RelationalVoterPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { DocumentVoterPersistenceModule } from './infrastructure/persistence/document/document-persistence.module';
import databaseConfig from '../database/config/database.config';
import { DatabaseConfig } from '../database/config/database-config.type';

// <database-block>
const infrastructurePersistenceModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? DocumentVoterPersistenceModule
  : RelationalVoterPersistenceModule;
// </database-block>

@Module({
  imports: [AuditLogModule, infrastructurePersistenceModule],
  controllers: [AdminVotersController],
  providers: [AdminVotersService],
  exports: [AdminVotersService, infrastructurePersistenceModule],
})
export class AdminVotersModule {}
