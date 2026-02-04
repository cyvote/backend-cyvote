import { Token } from '../../auth-voter/domain/token.model';

/**
 * Voter info for token generation context
 */
export interface VoterInfo {
  id: string;
  email: string;
  namaLengkap: string;
  nim: string;
}

/**
 * Token with associated voter information
 */
export interface TokenWithVoter {
  token: Token;
  voter: VoterInfo;
}
