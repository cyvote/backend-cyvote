import { BadRequestException } from '@nestjs/common';

export class ResendLimitReachedException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Resend token sudah mencapai batas maksimum');
  }
}
