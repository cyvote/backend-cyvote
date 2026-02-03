import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { CsrfModule } from './csrf/csrf.module';
import { HelmetModule } from './helmet/helmet.module';
import { SecurityAuditLoggerService } from './utils/security-audit-logger.service';
import { IpExtractorMiddleware } from './middleware/ip-extractor.middleware';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    AuditLogModule,
    RateLimitModule,
    CsrfModule,
    HelmetModule,
  ],
  providers: [SecurityAuditLoggerService],
  exports: [
    SecurityAuditLoggerService,
    RateLimitModule,
    CsrfModule,
    HelmetModule,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply IP extractor middleware to all routes
    consumer.apply(IpExtractorMiddleware).forRoutes('*');
  }
}
