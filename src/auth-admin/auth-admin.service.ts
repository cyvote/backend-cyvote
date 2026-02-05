import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import ms, { StringValue } from 'ms';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLoginResponseDto } from './dto/admin-login-response.dto';
import { AdminRepositoryInterface } from './interfaces/admin.repository.interface';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../audit-log/enums/audit-action.enum';
import { AuditActorType } from '../audit-log/enums/audit-actor-type.enum';
import { AuditStatus } from '../audit-log/enums/audit-status.enum';
import { AuditResourceType } from '../audit-log/enums/audit-resource-type.enum';
import { AllConfigType } from '../config/config.type';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthAdminService {
  constructor(
    @Inject('AdminRepositoryInterface')
    private readonly adminRepository: AdminRepositoryInterface,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly auditLogService: AuditLogService,
    private readonly i18n: I18nService,
  ) {}

  async validateLogin(dto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { username, password } = dto;

    // Find admin by username
    const admin = await this.adminRepository.findByUsername(username);

    if (!admin) {
      // Log failed login attempt (user not found)
      this.auditLogService.log({
        actorId: null,
        actorType: AuditActorType.ANONYMOUS,
        action: AuditAction.LOGIN_FAILED,
        resourceType: AuditResourceType.USER,
        status: AuditStatus.FAILED,
        details: {
          attemptedUsername: username,
          reason: 'User not found',
        },
      });

      throw new UnauthorizedException(
        this.i18n.t('adminAuth.invalidCredentials', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

    if (!isPasswordValid) {
      // Log failed login attempt (invalid password)
      this.auditLogService.log({
        actorId: admin.id,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.LOGIN_FAILED,
        resourceType: AuditResourceType.USER,
        resourceId: admin.id,
        status: AuditStatus.FAILED,
        details: {
          username: admin.username,
          reason: 'Invalid password',
        },
      });

      throw new UnauthorizedException(
        this.i18n.t('adminAuth.invalidCredentials', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Update last login timestamp
    await this.adminRepository.updateLastLogin(admin.id);

    // Generate JWT token
    const tokenExpiresIn = this.configService.getOrThrow('adminAuth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn as StringValue);

    const token = await this.jwtService.signAsync(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      {
        secret: this.configService.getOrThrow('adminAuth.secret', {
          infer: true,
        }),
        expiresIn: tokenExpiresIn as StringValue,
      },
    );

    // Log successful login
    this.auditLogService.log({
      actorId: admin.id,
      actorType: AuditActorType.ADMIN,
      action: AuditAction.LOGIN_SUCCESS,
      resourceType: AuditResourceType.USER,
      resourceId: admin.id,
      status: AuditStatus.SUCCESS,
      details: {
        username: admin.username,
        role: admin.role,
      },
    });

    return {
      message: this.i18n.t('adminAuth.loginSuccess', {
        lang: I18nContext.current()?.lang,
      }),
      token,
      tokenExpires,
    };
  }
}
