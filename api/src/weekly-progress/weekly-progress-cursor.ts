import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';

type WeeklyCursor = {
  coachId: string;
  weekStart: string;
  timeZone: string;
  athleteId: string;
};

function invalid(): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'cursor is invalid.',
  );
}

export function decodeWeeklyCursor(
  value: string,
  expected: Omit<WeeklyCursor, 'athleteId'>,
): WeeklyCursor {
  try {
    const cursor = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<WeeklyCursor>;
    if (
      cursor.coachId !== expected.coachId ||
      cursor.weekStart !== expected.weekStart ||
      cursor.timeZone !== expected.timeZone ||
      typeof cursor.athleteId !== 'string'
    ) {
      return invalid();
    }
    return cursor as WeeklyCursor;
  } catch {
    return invalid();
  }
}

export function encodeWeeklyCursor(value: WeeklyCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
