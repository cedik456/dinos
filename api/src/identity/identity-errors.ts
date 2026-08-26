import { HttpException, HttpStatus } from '@nestjs/common';

export type IdentityErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_UNLINKED'
  | 'IDENTITY_CONFLICT'
  | 'IDENTITY_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'ROLE_FORBIDDEN'
  | 'WORKOUT_DATE_TAKEN'
  | 'WORKOUT_TOO_EARLY'
  | 'WORKOUT_STATE_CONFLICT'
  | 'WORKOUT_RETRY_CONFLICT'
  | 'WORKOUT_NOT_FOUND'
  | 'TEMPLATE_NOT_FOUND'
  | 'ROSTER_REQUIRED'
  | 'INVITATION_UNAVAILABLE'
  | 'INVITATION_NOT_SENT'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_STATE_CONFLICT'
  | 'VALIDATION_FAILED';

export class IdentityException extends HttpException {
  constructor(
    readonly code: IdentityErrorCode,
    status: HttpStatus,
    message: string,
  ) {
    super(message, status);
  }
}
