import { BadRequestException } from '@nestjs/common';

export class TokenAlreadyUsedException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'Token sudah digunakan');
  }
}
