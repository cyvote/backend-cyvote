import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteEntity } from './entities/vote.entity';
import { VoteHashEntity } from './entities/vote-hash.entity';
import { VoterEntity } from '../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { CandidateEntity } from '../../../../admin-candidates/infrastructure/persistence/relational/entities/candidate.entity';
import { ElectionConfigEntity } from '../../../../election-schedule/infrastructure/persistence/relational/entities/election-config.entity';
import { VoteRepository } from './repositories/vote.repository';
import { CandidateRepository } from './repositories/candidate.repository';
import { ElectionConfigRepository } from './repositories/election-config.repository';
import { VoterRepository } from './repositories/voter.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoteEntity,
      VoteHashEntity,
      VoterEntity,
      CandidateEntity,
      ElectionConfigEntity,
    ]),
  ],
  providers: [
    {
      provide: 'VoteRepositoryInterface',
      useClass: VoteRepository,
    },
    {
      provide: 'CandidateRepositoryInterface',
      useClass: CandidateRepository,
    },
    {
      provide: 'ElectionConfigRepositoryInterface',
      useClass: ElectionConfigRepository,
    },
    {
      provide: 'VoterRepositoryInterface',
      useClass: VoterRepository,
    },
  ],
  exports: [
    'VoteRepositoryInterface',
    'CandidateRepositoryInterface',
    'ElectionConfigRepositoryInterface',
    'VoterRepositoryInterface',
  ],
})
export class RelationalPersistenceModule {}
