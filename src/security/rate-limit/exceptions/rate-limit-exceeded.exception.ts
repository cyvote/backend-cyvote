import { HttpException, HttpStatus } from '@nestjs/common';

export interface RateLimitErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  retryAfter: number;
}

export class RateLimitExceededException extends HttpException {
  constructor(
    private readonly retryAfter: number,
    message?: string,
  ) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: message || 'Rate limit exceeded. Please try again later.',
        error: 'Too Many Requests',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  getRetryAfter(): number {
    return this.retryAfter;
  }

  getHeaders(): Record<string, string> {
    return {
      'Retry-After': this.retryAfter.toString(),
    };
  }
}
