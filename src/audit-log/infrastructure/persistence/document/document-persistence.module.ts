import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuditLogSchemaClass,
  AuditLogSchema,
} from './entities/audit-log.schema';
import { AuditLogDocumentRepository } from './repositories/audit-log.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLogSchemaClass.name, schema: AuditLogSchema },
    ]),
  ],
  providers: [
    {
      provide: 'AuditLogRepositoryInterface',
      useClass: AuditLogDocumentRepository,
    },
  ],
  exports: ['AuditLogRepositoryInterface'],
})
export class DocumentAuditLogPersistenceModule {}
