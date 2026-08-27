import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import { parseIsoDate } from '../workouts/workout-validation';
import type { WeeklyProgressInput } from './weekly-progress.types';

function invalid(message: string): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    message,
  );
}

function single(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    return invalid(`${field} must be provided once.`);
  }
  return value;
}

export function parseWeeklyProgressInput(
  query: Record<string, unknown>,
): WeeklyProgressInput {
  const weekStart = parseIsoDate(
    single(query.weekStart, 'weekStart'),
    'weekStart',
  );
  const [year, month, day] = weekStart.split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 1) {
    return invalid('weekStart must be a Monday.');
  }

  const timeZoneValue = single(query.timeZone, 'timeZone');
  if (!timeZoneValue || timeZoneValue.length > 64) {
    return invalid('timeZone must be a valid IANA time zone.');
  }
  let timeZone: string;
  try {
    timeZone = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZoneValue,
    }).resolvedOptions().timeZone;
  } catch {
    return invalid('timeZone must be a valid IANA time zone.');
  }

  const limitValue = single(query.limit, 'limit');
  const limit = limitValue === undefined ? 20 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return invalid('limit must be an integer from 1 through 50.');
  }

  return {
    weekStart,
    timeZone,
    cursor: single(query.cursor, 'cursor') ?? null,
    limit,
  };
}

export function parseAthleteAccountId(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return invalid('athleteAccountId must be a UUID.');
  }
  return value;
}
