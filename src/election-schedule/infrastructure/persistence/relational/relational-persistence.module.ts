import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElectionConfigEntity } from './entities/election-config.entity';
import { ElectionConfigRelationalRepository } from './repositories/election-config.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ElectionConfigEntity])],
  providers: [
    {
      provide: 'ElectionConfigRepositoryInterface',
      useClass: ElectionConfigRelationalRepository,
    },
  ],
  exports: ['ElectionConfigRepositoryInterface'],
})
export class ElectionScheduleRelationalPersistenceModule {}
