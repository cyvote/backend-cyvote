import { NotFoundException } from '@nestjs/common';

export class NoNonVotersFoundException extends NotFoundException {
  constructor(message: string) {
    super(message);
  }
}
