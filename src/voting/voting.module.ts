import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { VotingService } from './voting.service';
import { VotingController } from './voting.controller';
import { VoterAuthGuard } from './guards/voter-auth.guard';
import { RelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RateLimitModule } from '../security/rate-limit/rate-limit.module';
import votingConfig from './config/voting.config';

@Module({
  imports: [
    ConfigModule.forFeature(votingConfig),
    JwtModule.register({}),
    RelationalPersistenceModule,
    AuditLogModule,
    RateLimitModule,
  ],
  controllers: [VotingController],
  providers: [VotingService, VoterAuthGuard],
  exports: [VotingService],
})
export class VotingModule {}
