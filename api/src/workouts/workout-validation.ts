import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import type {
  WorkoutExerciseInput,
  WorkoutListFilters,
  WorkoutUpsertInput,
} from './workout.types';

function invalid(message: string): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    message,
  );
}

function normalizedText(
  value: unknown,
  field: string,
  maximum: number,
  optional = false,
): string | null {
  if (value === undefined || value === null) {
    if (optional) return null;
    return invalid(`${field} is required.`);
  }
  if (typeof value !== 'string') return invalid(`${field} must be text.`);
  const normalized = value.trim();
  if (!normalized) {
    if (optional) return null;
    return invalid(`${field} is required.`);
  }
  if ([...normalized].length > maximum) {
    return invalid(`${field} is too long.`);
  }
  return normalized;
}

export function normalizeOptionalText(
  value: unknown,
  field: string,
  maximum = 1000,
): string | null {
  return normalizedText(value, field, maximum, true);
}

export function parseIsoDate(value: unknown, field = 'assignedDate'): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return invalid(`${field} must use YYYY-MM-DD.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return invalid(`${field} must be a valid calendar date.`);
  }
  return value;
}

export function canonicalTimeZone(value: unknown): string {
  const input = normalizedText(value, 'creationTimeZone', 64)!;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: input,
    }).resolvedOptions().timeZone;
  } catch {
    return invalid('creationTimeZone must be a valid IANA time zone.');
  }
}

export function dateInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function parseExercises(value: unknown): WorkoutExerciseInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) {
    return invalid('exercises must contain 1 through 12 items.');
  }
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return invalid(`exercises ${index + 1} is invalid.`);
    }
    const input = item as Record<string, unknown>;
    const referenceExerciseId = input.referenceExerciseId;
    if (
      typeof referenceExerciseId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        referenceExerciseId,
      )
    ) {
      return invalid(`exercises ${index + 1} referenceExerciseId is invalid.`);
    }
    if (
      !Number.isInteger(input.sets) ||
      Number(input.sets) < 1 ||
      Number(input.sets) > 20
    ) {
      return invalid(`exercises ${index + 1} sets must be from 1 through 20.`);
    }
    return {
      referenceExerciseId,
      sets: Number(input.sets),
      repetitions: normalizedText(
        input.repetitions,
        `exercises ${index + 1} repetitions`,
        32,
      )!,
    };
  });
}

export function parseWorkoutInput(
  value: unknown,
  requireTimeZone: boolean,
): WorkoutUpsertInput {
  if (!value || typeof value !== 'object')
    return invalid('Request body is required.');
  const input = value as Record<string, unknown>;
  const athleteAccountId = input.athleteAccountId;
  if (
    requireTimeZone &&
    athleteAccountId !== undefined &&
    (typeof athleteAccountId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        athleteAccountId,
      ))
  ) {
    return invalid('athleteAccountId must be a UUID.');
  }
  return {
    ...(requireTimeZone && typeof athleteAccountId === 'string'
      ? { athleteAccountId }
      : {}),
    title: normalizedText(input.title, 'title', 100)!,
    overviewNote: normalizedText(
      input.overviewNote,
      'overviewNote',
      1000,
      true,
    ),
    assignedDate: parseIsoDate(input.assignedDate),
    ...(requireTimeZone
      ? { creationTimeZone: canonicalTimeZone(input.creationTimeZone) }
      : {}),
    exercises: parseExercises(input.exercises),
  };
}

function singleQueryValue(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string')
    return invalid(`${field} must be provided once.`);
  return value;
}

export function parseWorkoutListFilters(
  query: Record<string, unknown>,
): WorkoutListFilters {
  const limitValue = singleQueryValue(query.limit, 'limit');
  const limit = limitValue === undefined ? 20 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return invalid('limit must be an integer from 1 through 50.');
  }
  const statusValue = singleQueryValue(query.status, 'status');
  if (
    statusValue &&
    !['assigned', 'completed', 'reviewed'].includes(statusValue)
  ) {
    return invalid('status is invalid.');
  }
  const relativeValue = singleQueryValue(query.relative, 'relative');
  if (relativeValue && !['today', 'upcoming', 'past'].includes(relativeValue)) {
    return invalid('relative is invalid.');
  }
  const directionValue =
    singleQueryValue(query.direction, 'direction') ?? 'asc';
  if (!['asc', 'desc'].includes(directionValue))
    return invalid('direction is invalid.');
  const dateFromValue = singleQueryValue(query.dateFrom, 'dateFrom');
  const dateToValue = singleQueryValue(query.dateTo, 'dateTo');
  if (relativeValue && (dateFromValue || dateToValue)) {
    return invalid('relative cannot be combined with dateFrom or dateTo.');
  }
  const awaitingValue = singleQueryValue(
    query.awaitingReview,
    'awaitingReview',
  );
  if (awaitingValue && !['true', 'false'].includes(awaitingValue)) {
    return invalid('awaitingReview must be true or false.');
  }
  return {
    cursor: singleQueryValue(query.cursor, 'cursor') ?? null,
    limit,
    status: (statusValue as WorkoutListFilters['status']) ?? null,
    dateFrom: dateFromValue ? parseIsoDate(dateFromValue, 'dateFrom') : null,
    dateTo: dateToValue ? parseIsoDate(dateToValue, 'dateTo') : null,
    relative: (relativeValue as WorkoutListFilters['relative']) ?? null,
    awaitingReview: awaitingValue === 'true',
    direction: directionValue as 'asc' | 'desc',
  };
}

export function sameWorkoutContent(
  assignment: {
    title: string;
    overviewNote: string | null;
    assignedDate: string;
    creationTimeZone: string;
  },
  exercises: Array<{
    referenceExerciseId: string | null;
    sets: number;
    repetitions: string;
  }>,
  input: WorkoutUpsertInput,
): boolean {
  return (
    assignment.title === input.title &&
    assignment.overviewNote === input.overviewNote &&
    assignment.assignedDate === input.assignedDate &&
    (input.creationTimeZone === undefined ||
      assignment.creationTimeZone === input.creationTimeZone) &&
    exercises.length === input.exercises.length &&
    exercises.every((exercise, index) => {
      const candidate = input.exercises[index];
      return (
        exercise.referenceExerciseId === candidate.referenceExerciseId &&
        exercise.sets === candidate.sets &&
        exercise.repetitions === candidate.repetitions
      );
    })
  );
}
