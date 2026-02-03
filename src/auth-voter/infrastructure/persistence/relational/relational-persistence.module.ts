import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterEntity } from './entities/voter.entity';
import { TokenEntity } from './entities/token.entity';
import { VoterRepository } from './repositories/voter.repository';
import { TokenRepository } from './repositories/token.repository';

@Module({
  imports: [TypeOrmModule.forFeature([VoterEntity, TokenEntity])],
  providers: [
    {
      provide: 'VoterRepositoryInterface',
      useClass: VoterRepository,
    },
    {
      provide: 'TokenRepositoryInterface',
      useClass: TokenRepository,
    },
  ],
  exports: ['VoterRepositoryInterface', 'TokenRepositoryInterface'],
})
export class RelationalPersistenceModule {}
