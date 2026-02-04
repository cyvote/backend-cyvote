import { NotFoundException } from '@nestjs/common';

export class TokenNotFoundException extends NotFoundException {
  constructor(message?: string) {
    super(message || 'Token tidak ditemukan');
  }
}
