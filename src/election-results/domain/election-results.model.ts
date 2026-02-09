import { CandidateResult } from './candidate-result.model';

/**
 * ElectionResults domain model
 * Represents the complete election results including all candidates,
 * total votes, winner determination, and tie detection
 */
export class ElectionResults {
  candidates: CandidateResult[];
  totalVotes: number;
  winner: CandidateResult | null;
  isTie: boolean;
  calculatedAt: Date;

  constructor(data: Partial<ElectionResults> = {}) {
    Object.assign(this, data);
  }

  /**
   * Calculate percentages for all candidates based on totalVotes
   * Uses 2 decimal places for precision
   */
  static calculatePercentages(
    candidates: CandidateResult[],
    totalVotes: number,
  ): CandidateResult[] {
    if (totalVotes === 0) {
      return candidates.map(
        (c) =>
          new CandidateResult({
            ...c,
            percentage: 0,
          }),
      );
    }

    return candidates.map(
      (c) =>
        new CandidateResult({
          ...c,
          percentage: Math.round((c.voteCount / totalVotes) * 10000) / 100,
        }),
    );
  }

  /**
   * Determine the winner from candidates list
   * Returns null if no votes or tie between top candidates
   */
  static determineWinner(candidates: CandidateResult[]): {
    winner: CandidateResult | null;
    isTie: boolean;
  } {
    if (candidates.length === 0) {
      return { winner: null, isTie: false };
    }

    // Sort by vote count descending
    const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount);

    // Check for tie: top two candidates have same vote count
    if (sorted.length > 1 && sorted[0].voteCount === sorted[1].voteCount) {
      return { winner: null, isTie: true };
    }

    // No votes at all
    if (sorted[0].voteCount === 0) {
      return { winner: null, isTie: false };
    }

    return { winner: sorted[0], isTie: false };
  }
}
