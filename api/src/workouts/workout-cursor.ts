import { createHash } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import type { WorkoutActor, WorkoutListFilters } from './workout.types';

type CursorPayload = {
  version: 1;
  fingerprint: string;
  order: string[];
};

export function workoutFilterFingerprint(
  actor: WorkoutActor,
  filters: WorkoutListFilters,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        actorId: actor.id,
        role: actor.role,
        limit: filters.limit,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        relative: filters.relative,
        awaitingReview: filters.awaitingReview,
        direction: filters.direction,
      }),
    )
    .digest('hex');
}

export function encodeWorkoutCursor(
  fingerprint: string,
  order: string[],
): string {
  const payload: CursorPayload = { version: 1, fingerprint, order };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeWorkoutCursor(
  cursor: string,
  fingerprint: string,
  expectedOrderLength: number,
): string[] {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;
    if (
      parsed.version !== 1 ||
      parsed.fingerprint !== fingerprint ||
      !Array.isArray(parsed.order) ||
      parsed.order.length !== expectedOrderLength ||
      parsed.order.some((value) => typeof value !== 'string')
    ) {
      throw new Error('invalid cursor');
    }
    return parsed.order;
  } catch {
    throw new IdentityException(
      'VALIDATION_FAILED',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The cursor does not match this assignment list.',
    );
  }
}
