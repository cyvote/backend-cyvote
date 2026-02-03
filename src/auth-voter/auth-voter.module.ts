import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthVoterController } from './auth-voter.controller';
import { AuthVoterService } from './auth-voter.service';
import { RelationalPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { VoterLoginRateLimitGuard } from './guards/voter-login-rate-limit.guard';
import { VoterTokenRateLimitGuard } from './guards/voter-token-rate-limit.guard';
import { VoterSessionGuard } from './guards/voter-session.guard';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    ConfigModule,
    RelationalPersistenceModule,
    SecurityModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('auth.secret'),
        signOptions: {
          expiresIn: configService.get('auth.expires'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthVoterController],
  providers: [
    AuthVoterService,
    VoterLoginRateLimitGuard,
    VoterTokenRateLimitGuard,
    VoterSessionGuard,
  ],
  exports: [AuthVoterService],
})
export class AuthVoterModule {}
