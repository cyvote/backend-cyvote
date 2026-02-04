import { BadRequestException } from '@nestjs/common';

export class ElectionNotActiveException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Pemilihan tidak sedang berlangsung');
  }
}
