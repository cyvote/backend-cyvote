/**
 * VoteHash domain model
 * Represents the hash record for vote verification
 */
export class VoteHash {
  id: string;
  voteId: string;
  hash: string;
  verificationHash: string | null;
  createdAt: Date;

  constructor(data: Partial<VoteHash> = {}) {
    Object.assign(this, data);
  }
}
