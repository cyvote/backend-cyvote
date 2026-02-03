/**
 * Voter info returned in login response
 */
export class VoterInfoDto {
  nim: string;
  nama: string;
}

/**
 * DTO for voter login response
 * Returns a short-lived session token (not the voting token)
 */
export class VoterLoginResponseDto {
  sessionToken: string;
  tokenExpires: number;
  voter: VoterInfoDto;
}
