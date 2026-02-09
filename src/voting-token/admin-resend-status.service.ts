import { Inject, Injectable, Logger } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { TokenGenerationRepositoryInterface } from './interfaces/token-generation.repository.interface';
import { ResendStatusResponseDto } from './dto/resend-status-response.dto';
import {
  VoterNotFoundException,
  TokenAlreadyUsedException,
  TokenNotFoundException,
} from './errors';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';

/**
 * Service for admin to check voter token resend status
 */
@Injectable()
export class AdminResendStatusService {
  private readonly logger = new Logger(AdminResendStatusService.name);
  private readonly MAX_RESEND_COUNT = 3;

  constructor(
    @Inject('TokenGenerationRepositoryInterface')
    private readonly tokenRepository: TokenGenerationRepositoryInterface,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Get resend status for a specific voter's token
   * Validations:
   * - Voter must exist
   * - Token has not been used
   */
  async getResendStatus(
    voterId: string,
    adminId: string,
  ): Promise<ResendStatusResponseDto> {
    this.logger.log(
      `Admin ${adminId} checking resend status for voter ${voterId}`,
    );

    // 1. Find voter
    const voter = await this.tokenRepository.findVoterById(voterId);

    if (!voter) {
      throw new VoterNotFoundException(
        this.i18n.t('votingToken.voterNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 2. Find latest token for voter (regardless of used status)
    const latestToken =
      await this.tokenRepository.findLatestTokenByVoterId(voterId);

    if (!latestToken) {
      throw new TokenNotFoundException(
        this.i18n.t('votingToken.tokenNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 3. Check if token is already used
    if (latestToken.isUsed) {
      throw new TokenAlreadyUsedException(
        this.i18n.t('votingToken.tokenAlreadyUsed', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // 4. Log audit
    this.auditLogService.log({
      actorId: adminId,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.RESEND_STATUS_VIEWED,
      resourceType: AuditResourceType.TOKEN,
      resourceId: latestToken.id,
      status: AuditStatus.SUCCESS,
      details: {
        voterId,
        voterNim: voter.nim,
        resendCount: latestToken.resendCount,
        remainingResends: this.MAX_RESEND_COUNT - latestToken.resendCount,
      },
    });

    this.logger.log(
      `Resend status retrieved for voter ${voterId} (resend count: ${latestToken.resendCount})`,
    );

    // 5. Return response
    return {
      voterId: voter.id,
      resendCount: latestToken.resendCount,
      remainingResends: this.MAX_RESEND_COUNT - latestToken.resendCount,
    };
  }
}
