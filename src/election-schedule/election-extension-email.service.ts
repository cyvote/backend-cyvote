import { Inject, Injectable, Logger } from '@nestjs/common';
import { VoterRepositoryInterface } from '../admin-voters/interfaces/voter.repository.interface';
import { MailService } from '../mail/mail.service';
import { ElectionConfig } from './domain/election-config.model';

@Injectable()
export class ElectionExtensionEmailService {
  private readonly logger = new Logger(ElectionExtensionEmailService.name);

  constructor(
    @Inject('VoterRepositoryInterface')
    private readonly voterRepository: VoterRepositoryInterface,
    private readonly mailService: MailService,
  ) {}

  /**
   * Send extension notification emails asynchronously (fire-and-forget)
   * Does not block the main thread or throw errors to caller
   */
  async sendExtensionNotifications(
    newEndDate: Date,
    reason: string,
  ): Promise<void> {
    // Use setImmediate for non-blocking async behavior
    setImmediate(async () => {
      try {
        this.logger.log('Starting to send extension notification emails');

        // Get all voters (not soft-deleted)
        const { data: voters } = await this.voterRepository.findMany({
          page: 1,
          limit: 10000, // Get all voters
        });

        if (!voters || voters.length === 0) {
          this.logger.warn('No voters found to send extension notifications');
          return;
        }

        this.logger.log(
          `Sending extension notifications to ${voters.length} voters`,
        );

        // Format date for email
        const formattedEndDate = this.formatDateForEmail(newEndDate);
        const formattedEndTime = this.formatTimeForEmail(newEndDate);

        // Send emails in batches to avoid overwhelming the mail server
        const batchSize = 10;
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < voters.length; i += batchSize) {
          const batch = voters.slice(i, i + batchSize);

          const emailPromises = batch.map(async (voter) => {
            try {
              await this.mailService.sendElectionExtended({
                to: voter.email,
                data: {
                  nama: voter.namaLengkap,
                  new_end_date: formattedEndDate,
                  new_end_time: formattedEndTime,
                  reason,
                },
              });
              successCount++;
            } catch (error) {
              failCount++;
              this.logger.error(
                `Failed to send extension email to ${voter.email}`,
                error instanceof Error ? error.message : String(error),
              );
            }
          });

          await Promise.allSettled(emailPromises);

          // Small delay between batches to prevent rate limiting
          if (i + batchSize < voters.length) {
            await this.delay(100);
          }
        }

        this.logger.log(
          `Extension notification emails completed: ${successCount} success, ${failCount} failed`,
        );
      } catch (error) {
        this.logger.error(
          'Error sending extension notification emails',
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }

  /**
   * Format date for email display (e.g., "10 Februari 2026")
   */
  private formatDateForEmail(date: Date): string {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    // Convert to WIB
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const day = wibDate.getUTCDate();
    const month = months[wibDate.getUTCMonth()];
    const year = wibDate.getUTCFullYear();

    return `${day} ${month} ${year}`;
  }

  /**
   * Format time for email display (e.g., "17:00 WIB")
   */
  private formatTimeForEmail(date: Date): string {
    // Convert to WIB
    const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const hours = wibDate.getUTCHours().toString().padStart(2, '0');
    const minutes = wibDate.getUTCMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes} WIB`;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
