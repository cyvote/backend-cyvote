import crypto from 'crypto';

/**
 * TEMPORARY: Mock token generator for testing purposes
 *
 * This is a temporary utility for generating and hashing voting tokens
 * for testing purposes only. It should be replaced with a proper token
 * generation service in production.
 *
 * @see MOCK_TOKEN_README.md for more information
 */
export class MockTokenGenerator {
  /**
   * Generate a random alphanumeric token
   * @param length - Length of the token (default: 16)
   * @returns Random alphanumeric token
   */
  static generate(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';

    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      token += charset[randomBytes[i] % charset.length];
    }

    return token;
  }

  /**
   * Hash a token using SHA-256
   * Token is normalized to uppercase before hashing for consistency
   * @param token - The plain text token
   * @returns SHA-256 hash of the token
   */
  static hash(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token.toUpperCase())
      .digest('hex');
  }

  /**
   * Generate a token and return both plain and hashed versions
   * @param length - Length of the token (default: 16)
   * @returns Object with token and tokenHash
   */
  static generateWithHash(length: number = 16): {
    token: string;
    tokenHash: string;
  } {
    const token = this.generate(length);
    const tokenHash = this.hash(token);
    return { token, tokenHash };
  }
}
