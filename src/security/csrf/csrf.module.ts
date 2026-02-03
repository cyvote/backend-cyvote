import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfService } from './services/csrf.service';
import { CsrfGuard } from './guards/csrf.guard';
import { SecurityLoggerService } from '../utils/security-logger.service';

@Module({
  imports: [ConfigModule],
  providers: [SecurityLoggerService, CsrfService, CsrfGuard],
  exports: [CsrfService, CsrfGuard, SecurityLoggerService],
})
export class CsrfModule {}
