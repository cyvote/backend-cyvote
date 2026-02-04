import { Inject, Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { TokenGenerationRepositoryInterface } from './interfaces/token-generation.repository.interface';
import { TokenGenerationResultDto } from './dto/token-generation-result.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';

/**
 * Service for generating voting tokens
 */
@Injectable()
export class TokenGenerationService {
  private readonly logger = new Logger(TokenGenerationService.name);
  private readonly TOKEN_LENGTH = 8;
  private readonly TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  constructor(
    @Inject('TokenGenerationRepositoryInterface')
    private readonly tokenRepository: TokenGenerationRepositoryInterface,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Generate tokens for ALL voters without tokens
   * @returns Result with generated and failed counts
   */
  async generateAllTokens(): Promise<TokenGenerationResultDto> {
    this.logger.log('Starting token generation for all voters without tokens');

    // Get all voters without tokens
    const votersWithoutTokens =
      await this.tokenRepository.findVotersWithoutToken();

    if (votersWithoutTokens.length === 0) {
      this.logger.log('No voters without tokens found');
      return { generated: 0, failed: 0, total: 0 };
    }

    this.logger.log(
      `Found ${votersWithoutTokens.length} voters without tokens`,
    );

    let generated = 0;
    let failed = 0;

    // Map to store plaintext tokens temporarily for email sending
    const tokenMap = new Map<string, string>(); // voterId -> plaintext token

    for (const voter of votersWithoutTokens) {
      try {
        // Generate unique token
        const plaintextToken = await this.generateUniqueToken();

        // Hash the token
        const tokenHash = this.hashToken(plaintextToken);

        // Save to database
        await this.tokenRepository.createToken(voter.id, tokenHash);

        // Store plaintext for email sending later
        tokenMap.set(voter.id, plaintextToken);

        generated++;
        this.logger.debug(`Generated token for voter ${voter.id}`);
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to generate token for voter ${voter.id}: ${(error as Error).message}`,
        );
      }
    }

    // Log audit
    this.auditLogService.log({
      actorId: null,
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.TOKEN_BATCH_GENERATED,
      resourceType: AuditResourceType.TOKEN,
      status: AuditStatus.SUCCESS,
      details: {
        generated,
        failed,
        total: votersWithoutTokens.length,
      },
    });

    this.logger.log(
      `Token generation completed: ${generated} generated, ${failed} failed out of ${votersWithoutTokens.length}`,
    );

    return {
      generated,
      failed,
      total: votersWithoutTokens.length,
    };
  }

  /**
   * Generate a single unique 8-character alphanumeric token
   * Ensures uniqueness by checking database
   * @returns Plaintext token (NOT hashed)
   */
  async generateUniqueToken(): Promise<string> {
    let token: string;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      token = this.generateRandomToken();
      const tokenHash = this.hashToken(token);
      exists = await this.tokenRepository.existsByTokenHash(tokenHash);
      attempts++;
    }

    if (exists) {
      throw new Error('Failed to generate unique token after max attempts');
    }

    return token!;
  }

  /**
   * Generate random 8-character alphanumeric token
   */
  private generateRandomToken(): string {
    let token = '';
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH);

    for (let i = 0; i < this.TOKEN_LENGTH; i++) {
      token += this.TOKEN_CHARS[randomBytes[i] % this.TOKEN_CHARS.length];
    }

    return token;
  }

  /**
   * Hash token with SHA-256
   * Token is normalized to uppercase before hashing for consistency
   */
  hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token.toUpperCase())
      .digest('hex');
  }
}
