import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoteEntity } from '../../../../voting/infrastructure/persistence/relational/entities/vote.entity';
import { CandidateEntity } from '../../../../admin-candidates/infrastructure/persistence/relational/entities/candidate.entity';
import { ElectionConfigEntity } from '../../../../election-schedule/infrastructure/persistence/relational/entities/election-config.entity';
import { VoterEntity } from '../../../../admin-voters/infrastructure/persistence/relational/entities/voter.entity';
import { ElectionResultsRepository } from './repositories/election-results.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoteEntity,
      CandidateEntity,
      ElectionConfigEntity,
      VoterEntity,
    ]),
  ],
  providers: [
    {
      provide: 'ElectionResultsRepositoryInterface',
      useClass: ElectionResultsRepository,
    },
  ],
  exports: ['ElectionResultsRepositoryInterface'],
})
export class ElectionResultsRelationalPersistenceModule {}
