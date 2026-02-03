import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditLogRequestContextService } from '../audit-log-request-context.service';

@Injectable()
export class AuditLogContextInterceptor implements NestInterceptor {
  constructor(
    private readonly requestContextService: AuditLogRequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract request metadata
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || null;
    const userId = request.user?.id?.toString() || null;
    const timestamp = new Date();

    // Store in AsyncLocalStorage
    return new Observable((subscriber) => {
      this.requestContextService.run(
        {
          ipAddress,
          userAgent,
          userId,
          timestamp,
        },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }

  private extractIpAddress(request: any): string | null {
    // Try to get real IP from various headers
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fallback to connection remote address
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      null
    );
  }
}
