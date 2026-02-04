/**
 * Token domain model
 * Represents a voting token entity in the system
 */
export class Token {
  id: string;
  voterId: string | null;
  tokenHash: string;
  generatedAt: Date;
  usedAt: Date | null;
  isUsed: boolean;
  resendCount: number;
  emailSentAt: Date | null;

  constructor(partial?: Partial<Token>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }
}
