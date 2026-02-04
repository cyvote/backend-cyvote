import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateEntity } from './entities/candidate.entity';
import { CandidateRepository } from './repositories/candidate.repository';
import {
  ElectionConfigRepository,
  ElectionConfigEntity,
} from './repositories/election-config.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateEntity, ElectionConfigEntity])],
  providers: [
    {
      provide: 'CandidateRepositoryInterface',
      useClass: CandidateRepository,
    },
    {
      provide: 'ElectionConfigRepositoryInterface',
      useClass: ElectionConfigRepository,
    },
  ],
  exports: [
    'CandidateRepositoryInterface',
    'ElectionConfigRepositoryInterface',
  ],
})
export class RelationalCandidatePersistenceModule {}
