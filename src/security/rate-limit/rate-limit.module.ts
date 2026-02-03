import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitService } from './services/rate-limit.service';
import { InMemoryRateLimitStorageService } from './infrastructure/storage/in-memory-rate-limit-storage.service';
import { RATE_LIMIT_STORAGE } from './infrastructure/storage/rate-limit-storage.interface';
import { GlobalRateLimitGuard } from './guards/global-rate-limit.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { TokenVerificationRateLimitGuard } from './guards/token-verification-rate-limit.guard';
import { SecurityAuditLoggerService } from '../utils/security-audit-logger.service';

@Module({
  imports: [ConfigModule],
  providers: [
    SecurityAuditLoggerService,
    {
      provide: RATE_LIMIT_STORAGE,
      useClass: InMemoryRateLimitStorageService,
    },
    RateLimitService,
    GlobalRateLimitGuard,
    LoginRateLimitGuard,
    TokenVerificationRateLimitGuard,
  ],
  exports: [
    RateLimitService,
    GlobalRateLimitGuard,
    LoginRateLimitGuard,
    TokenVerificationRateLimitGuard,
    SecurityAuditLoggerService,
  ],
})
export class RateLimitModule {}
