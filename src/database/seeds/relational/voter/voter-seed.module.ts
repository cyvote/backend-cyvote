import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoterEntity } from '../../../../auth-voter/infrastructure/persistence/relational/entities/voter.entity';
import { VoterSeedService } from './voter-seed.service';

/**
 * VoterSeedModule
 *
 * This module and its service are restricted to execute seeding logic
 * only in non-production environments.
 */
@Module({
  imports: [TypeOrmModule.forFeature([VoterEntity])],
  providers: [VoterSeedService],
  exports: [VoterSeedService],
})
export class VoterSeedModule {}
