import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * i18n error code constants for election results
 */
export enum ElectionResultsErrorCode {
  ELECTION_NOT_CLOSED = 'electionResults.electionNotClosed',
  ELECTION_NOT_CLOSED_FOR_PUBLISH = 'electionResults.electionNotClosedForPublish',
  VERIFICATION_REQUIRED = 'electionResults.verificationRequired',
  VERIFICATION_NOT_PASSED = 'electionResults.verificationNotPassed',
  ELECTION_CONFIG_NOT_FOUND = 'electionResults.electionConfigNotFound',
  NO_VOTES_FOUND = 'electionResults.noVotesFound',
}

export class ElectionNotClosedException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Election Not Closed',
        message,
      },
      HttpStatus.BAD_REQUEST,
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

export class VerificationRequiredException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Verification Required',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class VerificationNotPassedException extends HttpException {
  constructor(message: string) {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        error: 'Verification Not Passed',
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
