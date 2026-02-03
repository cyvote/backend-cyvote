import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import ms, { StringValue } from 'ms';
import { VoterLoginDto } from './dto/voter-login.dto';
import { VoterLoginResponseDto } from './dto/voter-login-response.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { VerifyTokenResponseDto } from './dto/verify-token-response.dto';
import { VoterRepositoryInterface } from './interfaces/voter.repository.interface';
import { TokenRepositoryInterface } from './interfaces/token.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { AllConfigType } from '../config/config.type';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthVoterService {
  constructor(
    @Inject('VoterRepositoryInterface')
    private readonly voterRepository: VoterRepositoryInterface,
    @Inject('TokenRepositoryInterface')
    private readonly tokenRepository: TokenRepositoryInterface,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Step 1: Login with NIM
   * Validates NIM and returns session token
   * Note: Election status is NOT checked here - voters can login anytime
   */
  async login(dto: VoterLoginDto): Promise<VoterLoginResponseDto> {
    const { nim } = dto;

    // Find voter by NIM
    const voter = await this.voterRepository.findByNim(nim);

    if (!voter) {
      // Log failed login attempt (voter not found)
      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.VOTER_LOGIN_FAILED,
        resourceType: AuditResourceType.VOTER,
        status: AuditStatus.FAILED,
        details: {
          attemptedNim: nim,
          reason: 'Voter not found',
        },
      });

      throw new UnauthorizedException(
        this.i18n.t('voterAuth.nimNotFound', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Generate short-lived session token (5 minutes)
    const sessionTokenExpiresIn = '5m';
    const tokenExpires = Date.now() + ms(sessionTokenExpiresIn as StringValue);

    const sessionToken = await this.jwtService.signAsync(
      {
        voterId: voter.id,
        nim: voter.nim,
        type: 'voter_session',
      },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: sessionTokenExpiresIn,
      },
    );

    // Log successful login
    this.auditLogService.log({
      actorId: voter.id,
      actorType: AuditActorType.USER,
      action: AuditAction.VOTER_LOGIN_SUCCESS,
      resourceType: AuditResourceType.VOTER,
      resourceId: voter.id,
      status: AuditStatus.SUCCESS,
      details: {
        nim: voter.nim,
        nama: voter.namaLengkap,
      },
    });

    return {
      sessionToken,
      tokenExpires,
      voter: {
        nim: voter.nim,
        nama: voter.namaLengkap,
      },
    };
  }

  /**
   * Step 2: Verify voting token
   * Validates token hash (case-insensitive), returns authenticated JWT
   * Note: Election status is NOT checked here - voters can verify token anytime
   */
  async verifyToken(
    dto: VerifyTokenDto,
    voterId: string,
  ): Promise<VerifyTokenResponseDto> {
    const { token } = dto;

    // Hash the input token (SHA-256)
    const tokenHash = this.hashToken(token);

    // Find token by voter ID and hash (case-insensitive)
    const tokenEntity = await this.tokenRepository.findByVoterIdAndHash(
      voterId,
      tokenHash,
    );

    if (!tokenEntity) {
      this.auditLogService.log({
        actorId: voterId,
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_TOKEN_FAILED,
        resourceType: AuditResourceType.TOKEN,
        status: AuditStatus.FAILED,
        details: {
          voterId,
          reason: 'Token not found or invalid',
        },
      });

      throw new UnauthorizedException(
        this.i18n.t('voterAuth.tokenInvalid', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check if token is already used
    if (tokenEntity.isUsed) {
      this.auditLogService.log({
        actorId: voterId,
        actorType: AuditActorType.USER,
        action: AuditAction.VOTER_TOKEN_FAILED,
        resourceType: AuditResourceType.TOKEN,
        resourceId: tokenEntity.id,
        status: AuditStatus.FAILED,
        details: {
          voterId,
          tokenId: tokenEntity.id,
          reason: 'Token already used',
          usedAt: tokenEntity.usedAt,
        },
      });

      throw new UnauthorizedException(
        this.i18n.t('voterAuth.tokenAlreadyUsed', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Mark token as used
    await this.tokenRepository.markAsUsed(tokenEntity.id);

    // Generate authenticated JWT (30 minutes for voting)
    const authTokenExpiresIn = this.configService.get('auth.expires', {
      infer: true,
    }) as StringValue;
    const tokenExpires = Date.now() + ms(authTokenExpiresIn);

    const authToken = await this.jwtService.signAsync(
      {
        voterId,
        tokenId: tokenEntity.id,
        type: 'voter_authenticated',
      },
      {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
        expiresIn: authTokenExpiresIn,
      },
    );

    // Log successful token verification
    this.auditLogService.log({
      actorId: voterId,
      actorType: AuditActorType.USER,
      action: AuditAction.VOTER_TOKEN_VERIFIED,
      resourceType: AuditResourceType.TOKEN,
      resourceId: tokenEntity.id,
      status: AuditStatus.SUCCESS,
      details: {
        voterId,
        tokenId: tokenEntity.id,
      },
    });

    return {
      token: authToken,
      tokenExpires,
    };
  }

  /**
   * Hash token using SHA-256
   */
  hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token.toUpperCase()) // Normalize to uppercase for consistent hashing
      .digest('hex');
  }
}
