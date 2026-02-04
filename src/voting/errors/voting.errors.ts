/**
 * Voting error codes for i18n translation
 */
export enum VotingErrorCode {
  ELECTION_NOT_ACTIVE = 'voting.electionNotActive',
  CANDIDATE_NOT_FOUND = 'voting.candidateNotFound',
  ALREADY_VOTED = 'voting.alreadyVoted',
  VOTER_NOT_FOUND = 'voting.voterNotFound',
  VOTE_FAILED = 'voting.voteFailed',
  AUTH_REQUIRED = 'voting.authRequired',
  INVALID_TOKEN = 'voting.invalidToken',
  TOKEN_EXPIRED = 'voting.tokenExpired',
}

/**
 * Check if an error code is a VotingErrorCode
 */
export function isVotingErrorCode(code: string): code is VotingErrorCode {
  return Object.values(VotingErrorCode).includes(code as VotingErrorCode);
}
