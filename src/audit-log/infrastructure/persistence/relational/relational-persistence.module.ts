import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogRelationalRepository } from './repositories/audit-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    {
      provide: 'AuditLogRepositoryInterface',
      useClass: AuditLogRelationalRepository,
    },
  ],
  exports: ['AuditLogRepositoryInterface'],
})
export class RelationalAuditLogPersistenceModule {}
