import { NotFoundException } from '@nestjs/common';

export class NoVotersWithoutTokenException extends NotFoundException {
  constructor(message?: string) {
    super(message || 'Tidak ada voter yang belum memiliki token');
  }
}
