import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { CsrfService } from '../services/csrf.service';
import { SecurityLoggerService } from '../../utils/security-logger.service';
import { AllConfigType } from '../../../config/config.type';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly enabled: boolean;
  private readonly cookieName: string;
  private readonly headerName: string;

  constructor(
    private readonly csrfService: CsrfService,
    private readonly logger: SecurityLoggerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {
    const csrfConfig = this.configService.get('security.csrf', {
      infer: true,
    });

    this.enabled = csrfConfig?.enabled !== false;
    this.cookieName = csrfConfig?.cookieName || 'csrf-token';
    this.headerName = csrfConfig?.headerName || 'x-csrf-token';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method.toUpperCase();

    // Safe methods - generate and set token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await this.generateAndSetToken(request, response);
      return true;
    }

    // State-changing methods - validate token
    return this.validateCsrfToken(request);
  }

  /**
   * Generate and set CSRF token for safe methods
   */
  private generateAndSetToken(request: Request, response: Response): void {
    try {
      const sessionId = this.getSessionId(request);

      if (sessionId) {
        const token = this.csrfService.generateToken(sessionId);

        // Set token in cookie
        response.cookie(this.cookieName, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000, // 1 hour
        });

        this.logger.debug('CSRF token generated and set', {
          sessionId,
        });
      }
    } catch (error) {
      this.logger.error('Error generating CSRF token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate CSRF token for state-changing methods
   */
  private validateCsrfToken(request: Request): boolean {
    // Get session ID
    const sessionId = this.getSessionId(request);

    if (!sessionId) {
      this.logger.warn('No session ID found for CSRF validation', {
        method: request.method,
        url: request.url,
      });
      throw new UnauthorizedException('Session required for this operation');
    }

    // Get token from request
    const token = request.headers[this.headerName] || request.body?._csrf;

    if (!token || typeof token !== 'string') {
      this.logger.logCsrfViolation({
        sessionId,
        ip: (request as any).realIp || request.ip || '0.0.0.0',
        endpoint: `${request.method}:${request.url}`,
        reason: 'token_missing',
      });

      throw new ForbiddenException('CSRF token missing');
    }

    // Validate token
    const isValid = this.csrfService.validateToken(token, sessionId);

    if (!isValid) {
      this.logger.logCsrfViolation({
        sessionId,
        ip: (request as any).realIp || request.ip || '0.0.0.0',
        endpoint: `${request.method}:${request.url}`,
        reason: 'token_invalid',
      });

      throw new ForbiddenException('Invalid CSRF token');
    }

    this.logger.debug('CSRF token validated successfully', {
      sessionId,
    });

    return true;
  }

  /**
   * Get session ID from request
   */
  private getSessionId(request: Request): string | null {
    const user = (request as any).user;
    const session = (request as any).session;
    const sessionHeader = request.headers['x-session-id'];

    if (user?.sessionId) {
      return user.sessionId;
    }

    if (session?.id) {
      return session.id;
    }

    if (sessionHeader && typeof sessionHeader === 'string') {
      return sessionHeader;
    }

    return null;
  }
}
