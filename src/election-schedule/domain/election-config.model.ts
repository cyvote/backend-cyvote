/**
 * Election status enum
 * Represents the possible statuses of an election
 */
export enum ElectionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  PUBLISHED = 'PUBLISHED',
}

/**
 * ElectionConfig domain model
 * Represents an election configuration entity in the system
 */
export class ElectionConfig {
  id: string;
  startDate: Date;
  endDate: Date;
  status: ElectionStatus;
  resultsPublishedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial?: Partial<ElectionConfig>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Check if election is currently active
   */
  isActive(): boolean {
    return this.status === ElectionStatus.ACTIVE;
  }

  /**
   * Check if voting has ended
   */
  hasEnded(): boolean {
    return (
      this.status === ElectionStatus.CLOSED ||
      this.status === ElectionStatus.PUBLISHED
    );
  }

  /**
   * Check if voting has not started yet
   */
  hasNotStarted(): boolean {
    return this.status === ElectionStatus.SCHEDULED;
  }

  /**
   * Check if election duration is valid (6 hours to 7 days)
   */
  isWithinValidDuration(): boolean {
    const durationMs = this.endDate.getTime() - this.startDate.getTime();
    const sixHoursMs = 6 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return durationMs >= sixHoursMs && durationMs <= sevenDaysMs;
  }

  /**
   * Check if start date is in the future
   */
  isStartInFuture(): boolean {
    return this.startDate.getTime() > Date.now();
  }

  /**
   * Check if end date is after start date
   */
  isEndAfterStart(): boolean {
    return this.endDate.getTime() > this.startDate.getTime();
  }

  /**
   * Check if extension is valid (new end date is after current, within 24h)
   */
  isValidExtension(newEndDate: Date): boolean {
    if (newEndDate.getTime() <= this.endDate.getTime()) {
      return false;
    }
    const extensionMs = newEndDate.getTime() - this.endDate.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return extensionMs <= twentyFourHoursMs;
  }

  /**
   * Get current time in Jakarta timezone (GMT+7)
   */
  static getJakartaTime(): Date {
    const now = new Date();
    const jakartaOffset = 7 * 60 * 60 * 1000;
    const utcOffset = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() + utcOffset + jakartaOffset);
  }

  /**
   * Format date to WIB string (ISO 8601 with +07:00 offset)
   */
  static formatToWib(date: Date): string {
    const jakartaOffset = 7 * 60;
    const offsetDate = new Date(date.getTime() + jakartaOffset * 60 * 1000);
    const isoString = offsetDate.toISOString().replace('Z', '+07:00');
    return isoString;
  }

  /**
   * Parse WIB date string to Date object
   */
  static parseWibDate(dateString: string): Date {
    return new Date(dateString);
  }
}
