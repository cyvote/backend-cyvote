/**
 * Vote domain model
 * Represents a cast vote in the election system
 */
export class Vote {
  id: string;
  voterId: string;
  candidateId: string;
  voteHash: string;
  votedAt: Date;
  receiptCode: string;

  constructor(data: Partial<Vote> = {}) {
    Object.assign(this, data);
  }

  /**
   * Generate receipt code from vote hash
   * Format: VOTE-{first 8 characters of hash in uppercase}
   */
  static generateReceiptCode(voteHash: string): string {
    return `VOTE-${voteHash.slice(0, 8).toUpperCase()}`;
  }
}
