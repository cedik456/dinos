import { HttpException, HttpStatus } from '@nestjs/common';

export type IdentityErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_UNLINKED'
  | 'IDENTITY_CONFLICT'
  | 'IDENTITY_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'ROLE_FORBIDDEN';

export class IdentityException extends HttpException {
  constructor(
    readonly code: IdentityErrorCode,
    status: HttpStatus,
    message: string,
  ) {
    super(message, status);
  }
}
