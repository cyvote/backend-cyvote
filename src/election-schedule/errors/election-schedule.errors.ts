import { HttpException, HttpStatus } from '@nestjs/common';

export class ElectionConfigAlreadyExistsException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.CONFLICT,
        error: 'Election Config Already Exists',
        message,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class ElectionConfigNotFoundException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.NOT_FOUND,
        error: 'Election Config Not Found',
        message,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidElectionDurationException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid Election Duration',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class StartDateMustBeFutureException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Start Date Must Be Future',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class EndDateMustBeAfterStartException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'End Date Must Be After Start',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ElectionNotActiveException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Election Not Active',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidExtensionDateException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Invalid Extension Date',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class ExtensionExceedsMaximumException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Extension Exceeds Maximum',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
