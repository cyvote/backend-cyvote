import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterEntity } from './entities/voter.entity';
import { VoterRepository } from './repositories/voter.repository';

@Module({
  imports: [TypeOrmModule.forFeature([VoterEntity])],
  providers: [
    {
      provide: 'VoterRepositoryInterface',
      useClass: VoterRepository,
    },
  ],
  exports: ['VoterRepositoryInterface'],
})
export class RelationalVoterPersistenceModule {}
