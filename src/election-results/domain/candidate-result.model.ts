/**
 * CandidateResult domain model
 * Represents a single candidate's vote count and percentage in the election results
 */
export class CandidateResult {
  candidateId: string;
  candidateName: string;
  voteCount: number;
  percentage: number;

  constructor(data: Partial<CandidateResult> = {}) {
    Object.assign(this, data);
  }
}
