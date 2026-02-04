import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterEntity } from '../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { DashboardRepository } from './repositories/dashboard.repository';

@Module({
  imports: [TypeOrmModule.forFeature([VoterEntity])],
  providers: [
    {
      provide: 'DashboardRepositoryInterface',
      useClass: DashboardRepository,
    },
  ],
  exports: ['DashboardRepositoryInterface'],
})
export class RelationalDashboardPersistenceModule {}
