/**
 * Verification status constants
 */
export const VERIFICATION_STATUS = {
  PASS: 'PASS',
  FAIL: 'FAIL',
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

/**
 * VerificationResult domain model
 * Represents the result of vote integrity verification
 */
export class VerificationResult {
  status: VerificationStatus;
  totalVerified: number;
  corruptedVotes: string[];
  verifiedAt: Date;

  constructor(data: Partial<VerificationResult> = {}) {
    Object.assign(this, data);
  }

  /**
   * Check if verification passed
   */
  isPassed(): boolean {
    return this.status === VERIFICATION_STATUS.PASS;
  }

  /**
   * Check if verification failed
   */
  isFailed(): boolean {
    return this.status === VERIFICATION_STATUS.FAIL;
  }
}
