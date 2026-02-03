import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterEntity } from './entities/voter.entity';
import { TokenEntity } from './entities/token.entity';
import { ElectionConfigEntity } from './entities/election-config.entity';
import { VoterRepository } from './repositories/voter.repository';
import { TokenRepository } from './repositories/token.repository';
import { ElectionConfigRepository } from './repositories/election-config.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([VoterEntity, TokenEntity, ElectionConfigEntity]),
  ],
  providers: [
    {
      provide: 'VoterRepositoryInterface',
      useClass: VoterRepository,
    },
    {
      provide: 'TokenRepositoryInterface',
      useClass: TokenRepository,
    },
    {
      provide: 'ElectionConfigRepositoryInterface',
      useClass: ElectionConfigRepository,
    },
  ],
  exports: [
    'VoterRepositoryInterface',
    'TokenRepositoryInterface',
    'ElectionConfigRepositoryInterface',
  ],
})
export class RelationalPersistenceModule {}
