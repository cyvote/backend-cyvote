import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { CsrfModule } from './csrf/csrf.module';
import { HelmetModule } from './helmet/helmet.module';
import { SecurityLoggerService } from './utils/security-logger.service';
import { IpExtractorMiddleware } from './middleware/ip-extractor.middleware';

@Global()
@Module({
  imports: [ConfigModule, RateLimitModule, CsrfModule, HelmetModule],
  providers: [SecurityLoggerService],
  exports: [SecurityLoggerService, RateLimitModule, CsrfModule, HelmetModule],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply IP extractor middleware to all routes
    consumer.apply(IpExtractorMiddleware).forRoutes('*');
  }
}
