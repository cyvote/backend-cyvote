import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminCandidatesController } from './admin-candidates.controller';
import { CandidatesController } from './candidates.controller';
import { AdminCandidatesService } from './admin-candidates.service';
import { RelationalCandidatePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { SupabaseStorageService } from './infrastructure/storage/supabase-storage.service';
import { VoterAuthGuard } from './guards/voter-auth.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import supabaseStorageConfig from './config/supabase-storage.config';

@Module({
  imports: [
    ConfigModule.forFeature(supabaseStorageConfig),
    JwtModule.register({}),
    RelationalCandidatePersistenceModule,
    AuditLogModule,
  ],
  controllers: [AdminCandidatesController, CandidatesController],
  providers: [
    AdminCandidatesService,
    {
      provide: 'StorageServiceInterface',
      useClass: SupabaseStorageService,
    },
    VoterAuthGuard,
  ],
  exports: [AdminCandidatesService],
})
export class AdminCandidatesModule {}
