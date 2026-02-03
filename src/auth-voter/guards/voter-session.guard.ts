import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';

/**
 * Guard for voter session token validation
 * Validates the short-lived session token from login step
 */
@Injectable()
export class VoterSessionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        this.i18n.t('voterAuth.sessionRequired', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.secret'),
      });

      // Validate that this is a voter session token
      if (!payload.voterId || payload.type !== 'voter_session') {
        throw new UnauthorizedException(
          this.i18n.t('voterAuth.invalidSession', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }

      // Attach payload to request for downstream use
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException(
        this.i18n.t('voterAuth.sessionExpired', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
