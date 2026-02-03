import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSeedService } from './admin-seed.service';
import { AdminEntity } from '../../../../auth-admin/infrastructure/persistence/relational/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminEntity])],
  providers: [AdminSeedService],
  exports: [AdminSeedService],
})
export class AdminSeedModule {}
