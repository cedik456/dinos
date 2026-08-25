import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';

type CursorPayload = {
  version: 1;
  actorId: string;
  kind: 'exercises' | 'templates';
  query: string;
  offset: number;
};

export function encodeTemplateCursor(payload: Omit<CursorPayload, 'version'>) {
  return Buffer.from(JSON.stringify({ version: 1, ...payload })).toString(
    'base64url',
  );
}

export function decodeTemplateCursor(
  cursor: string | null,
  expected: Omit<CursorPayload, 'version' | 'offset'>,
) {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;
    if (
      parsed.version !== 1 ||
      parsed.actorId !== expected.actorId ||
      parsed.kind !== expected.kind ||
      parsed.query !== expected.query ||
      !Number.isInteger(parsed.offset) ||
      Number(parsed.offset) < 0
    ) {
      throw new Error('invalid cursor');
    }
    return Number(parsed.offset);
  } catch {
    throw new IdentityException(
      'VALIDATION_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The cursor does not match this list.',
    );
  }
}
