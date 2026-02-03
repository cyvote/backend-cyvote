import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailService } from './email.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [ConfigModule, MailerModule],
  providers: [MailService, EmailService],
  exports: [MailService, EmailService],
})
export class MailModule {}
