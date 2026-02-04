import { NotFoundException } from '@nestjs/common';

export class VoterNotFoundException extends NotFoundException {
  constructor(message?: string) {
    super(message || 'Voter tidak ditemukan');
  }
}
