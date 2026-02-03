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
}
