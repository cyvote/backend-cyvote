import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AllConfigType } from '../../../config/config.type';
import { SecurityAuditLoggerService } from '../../utils/security-audit-logger.service';

interface CsrfTokenPayload {
  sessionId: string;
  timestamp: number;
  random: string;
}

@Injectable()
export class CsrfService {
  private readonly secret: string;
  private readonly ttl: number;

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly logger: SecurityAuditLoggerService,
  ) {
    const csrfConfig = this.configService.get('security.csrf', {
      infer: true,
    });

    this.secret = csrfConfig?.secret || 'default-secret-change-me';
    this.ttl = csrfConfig?.ttl || 3600;

    if (this.secret === 'default-secret-change-me') {
      this.logger.warn(
        'Using default CSRF secret. Please set SECURITY_CSRF_SECRET in production.',
      );
    }
  }

  /**
   * Generate CSRF token for a session
   */
  generateToken(sessionId: string): string {
    const payload: CsrfTokenPayload = {
      sessionId,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex'),
    };

    const payloadString = JSON.stringify(payload);
    const encodedPayload = Buffer.from(payloadString).toString('base64');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadString)
      .digest('hex');

    return `${encodedPayload}.${signature}`;
  }

  /**
   * Validate CSRF token
   */
  validateToken(token: string, sessionId: string): boolean {
    try {
      // Parse token
      const parts = token.split('.');
      if (parts.length !== 2) {
        this.logger.debug('Invalid CSRF token format');
        return false;
      }

      const [encodedPayload, providedSignature] = parts;

      // Decode payload
      const payloadString = Buffer.from(encodedPayload, 'base64').toString();
      const payload: CsrfTokenPayload = JSON.parse(payloadString);

      // Validate session ID
      if (payload.sessionId !== sessionId) {
        this.logger.warn('CSRF token session ID mismatch', {
          expected: sessionId,
          received: payload.sessionId,
        });
        return false;
      }

      // Validate timestamp (TTL)
      const currentTime = Date.now();
      const tokenAge = currentTime - payload.timestamp;

      if (tokenAge > this.ttl * 1000) {
        this.logger.debug('CSRF token expired', {
          age: tokenAge / 1000,
          ttl: this.ttl,
        });
        return false;
      }

      // Validate signature
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(payloadString)
        .digest('hex');

      if (expectedSignature !== providedSignature) {
        this.logger.warn('CSRF token signature mismatch');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error validating CSRF token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Clear CSRF token from response
   */
  clearToken(response: any): void {
    const csrfConfig = this.configService.get('security.csrf', {
      infer: true,
    });

    const cookieName = csrfConfig?.cookieName || 'csrf-token';

    response.clearCookie(cookieName, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
  }
}
