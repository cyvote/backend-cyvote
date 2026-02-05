import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedHistoryEntity } from './entities/seed-history.entity';
import { SeedTrackerService } from './seed-tracker.service';

@Module({
  imports: [TypeOrmModule.forFeature([SeedHistoryEntity])],
  providers: [SeedTrackerService],
  exports: [SeedTrackerService],
})
export class SeedTrackerModule {}
