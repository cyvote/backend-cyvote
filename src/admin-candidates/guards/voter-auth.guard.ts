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
 * Guard for voter authentication (authenticated JWT from verify-token)
 * Validates JWT with type: 'voter_authenticated'
 */
@Injectable()
export class VoterAuthGuard implements CanActivate {
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
        this.i18n.t('candidates.authRequired', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.secret'),
      });

      // Validate that this is an authenticated voter token
      if (!payload.voterId || payload.type !== 'voter_authenticated') {
        throw new UnauthorizedException(
          this.i18n.t('candidates.invalidToken', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }

      // Attach payload to request for downstream use
      (request as any).user = payload;
    } catch {
      throw new UnauthorizedException(
        this.i18n.t('candidates.tokenExpired', {
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
