import { Inject, Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { TokenGenerationRepositoryInterface } from './interfaces/token-generation.repository.interface';
import { ElectionConfigRepositoryInterface } from '../election-schedule/interfaces/election-config.repository.interface';
import { TokenEmailDistributionService } from './token-email-distribution.service';
import { ResendTokenResponseDto } from './dto/resend-token-response.dto';
import {
  VoterNotFoundException,
  ElectionNotActiveException,
  TokenAlreadyUsedException,
  ResendLimitReachedException,
  TokenNotFoundException,
} from './errors';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { ElectionStatus } from '../election-schedule/domain/election-config.model';

/**
 * Service for admin to resend voting tokens
 */
@Injectable()
export class AdminResendTokenService {
  private readonly logger = new Logger(AdminResendTokenService.name);
  private readonly MAX_RESEND_COUNT = 3;
  private readonly TOKEN_LENGTH = 8;
  private readonly TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  constructor(
    @Inject('TokenGenerationRepositoryInterface')
    private readonly tokenRepository: TokenGenerationRepositoryInterface,
    @Inject('ElectionConfigRepositoryInterface')
    private readonly electionConfigRepository: ElectionConfigRepositoryInterface,
    private readonly tokenEmailDistributionService: TokenEmailDistributionService,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Resend token to a specific voter
   * Validations:
   * - Voter must exist
   * - resend_count < 3
   * - Election status == ACTIVE
   * - Token not used
   *
   * Creates NEW token (old is invalidated)
   */
  async resendToken(
    voterId: string,
    adminId: string,
  ): Promise<ResendTokenResponseDto> {
    this.logger.log(`Admin ${adminId} resending token to voter ${voterId}`);

    // 1. Find voter
    const voter = await this.tokenRepository.findVoterById(voterId);

    if (!voter) {
      throw new VoterNotFoundException(
        this.i18n.t('votingToken.voterNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 2. Check election status
    const electionConfig =
      await this.electionConfigRepository.findCurrentConfig();

    if (!electionConfig || electionConfig.status !== ElectionStatus.ACTIVE) {
      throw new ElectionNotActiveException(
        this.i18n.t('votingToken.electionNotActive', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 3. Get current token
    const currentToken =
      await this.tokenRepository.findActiveTokenByVoterId(voterId);

    if (!currentToken) {
      throw new TokenNotFoundException(
        this.i18n.t('votingToken.tokenNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 4. Check if token is already used
    if (currentToken.isUsed) {
      throw new TokenAlreadyUsedException(
        this.i18n.t('votingToken.tokenAlreadyUsed', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 5. Check resend count
    if (currentToken.resendCount >= this.MAX_RESEND_COUNT) {
      throw new ResendLimitReachedException(
        this.i18n.t('votingToken.resendLimitReached', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 6. Generate new token
    const plaintextToken = this.generateRandomToken();
    const tokenHash = this.hashToken(plaintextToken);

    // 7. Replace old token with new one
    const newToken = await this.tokenRepository.replaceToken(
      voterId,
      tokenHash,
      currentToken.resendCount,
    );

    // 8. Increment resend count
    await this.tokenRepository.incrementResendCount(newToken.id);

    // 9. Send email directly
    const emailSent =
      await this.tokenEmailDistributionService.sendSingleTokenEmail(
        voterId,
        plaintextToken,
        voter.email,
        voter.namaLengkap,
        voter.nim,
      );

    if (emailSent) {
      await this.tokenRepository.markEmailSent(newToken.id);
    }

    // 10. Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.TOKEN_RESENT,
      resourceType: AuditResourceType.TOKEN,
      resourceId: newToken.id,
      status: AuditStatus.SUCCESS,
      details: {
        voterId,
        voterNim: voter.nim,
        voterEmail: voter.email,
        previousResendCount: currentToken.resendCount,
        newResendCount: currentToken.resendCount + 1,
        emailSent,
      },
    });

    const newResendCount = currentToken.resendCount + 1;

    this.logger.log(
      `Token resent to voter ${voterId} (resend count: ${newResendCount})`,
    );

    return {
      success: true,
      message: this.i18n.t('votingToken.tokenResent', {
        lang: I18nContext.current()?.lang,
      }),
      resendCount: newResendCount,
      remainingResends: this.MAX_RESEND_COUNT - newResendCount,
    };
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
   */
  private hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token.toUpperCase())
      .digest('hex');
  }
}
