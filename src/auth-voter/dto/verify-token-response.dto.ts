/**
 * DTO for verify token response
 * Returns an authenticated JWT session token
 */
export class VerifyTokenResponseDto {
  token: string;
  tokenExpires: number;
}
