import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MailerService } from '../mailer/mailer.service';
import { AllConfigType } from '../config/config.type';
import { SendEmailOptions } from './interfaces/email-options.interface';
import { SendEmailResult } from './interfaces/send-email-result.interface';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
  };

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Send email with retry mechanism
   * Main method as per requirement: sendEmail({ to, subject, htmlBody })
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.logger.debug(`Preparing to send email to: ${options.to}`);

    const result = await this.sendEmailWithRetry(
      options,
      this.defaultRetryConfig,
    );

    // Log to audit
    await this.logEmailDelivery(
      Array.isArray(options.to) ? options.to.join(',') : options.to,
      options.subject,
      result.success ? 'SUCCESS' : 'FAILURE',
      {
        attempts: result.attempts,
        messageId: result.messageId,
        error: result.error?.message,
      },
    );

    return result;
  }

  /**
   * Send email with retry logic
   */
  private async sendEmailWithRetry(
    options: SendEmailOptions,
    retryConfig: RetryConfig,
  ): Promise<SendEmailResult> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i < retryConfig.maxRetries; i++) {
      attempts++;

      try {
        this.logger.debug(
          `Email send attempt ${attempts}/${retryConfig.maxRetries}`,
        );

        const info = await this.mailerService.sendMail({
          to: options.to,
          subject: options.subject,
          html: options.htmlBody,
          from: options.from,
          cc: options.cc,
          bcc: options.bcc,
        });

        this.logger.log(
          `Email sent successfully on attempt ${attempts}, messageId: ${info.messageId}`,
        );

        return {
          success: true,
          messageId: info.messageId,
          attempts,
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Email send attempt ${attempts} failed: ${lastError.message}`,
        );

        // Check if we should retry
        if (!this.shouldRetry(lastError, attempts, retryConfig.maxRetries)) {
          break;
        }

        // Calculate delay for next retry
        if (attempts < retryConfig.maxRetries) {
          const delay = this.calculateDelay(
            attempts,
            retryConfig.initialDelay,
            retryConfig.backoffMultiplier,
            retryConfig.maxDelay,
          );

          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `Email failed after ${attempts} attempts: ${lastError?.message}`,
    );

    return {
      success: false,
      attempts,
      error: lastError,
    };
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(
    error: Error,
    attempt: number,
    maxRetries: number,
  ): boolean {
    // Don't retry if max attempts reached
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry on validation errors
    if (
      error.message.includes('Invalid') ||
      error.message.includes('invalid')
    ) {
      return false;
    }

    // Don't retry on permanent SMTP errors (5xx codes)
    if (error.message.includes('550') || error.message.includes('551')) {
      return false;
    }

    // Retry on temporary errors (4xx, network issues, timeouts)
    return true;
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  private calculateDelay(
    attempt: number,
    initialDelay: number,
    multiplier: number,
    maxDelay: number,
  ): number {
    const delay = initialDelay * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log email delivery status to audit_logs table
   */
  private async logEmailDelivery(
    to: string,
    subject: string,
    status: 'SUCCESS' | 'FAILURE',
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const result = await this.dataSource.query(
        `INSERT INTO audit_logs (
          actor_type, 
          action, 
          resource_type, 
          status, 
          details, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [
          'SYSTEM',
          status === 'SUCCESS' ? 'EMAIL_SENT' : 'EMAIL_FAILED',
          'EMAIL',
          status,
          JSON.stringify({
            to,
            subject,
            ...details,
            timestamp: new Date().toISOString(),
          }),
        ],
      );

      this.logger.debug(
        `Email delivery logged to audit_logs: ${status} (ID: ${result[0]?.id})`,
      );
    } catch (error) {
      // Don't throw if audit logging fails - log locally instead
      this.logger.error(
        `Failed to log email delivery to audit: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
