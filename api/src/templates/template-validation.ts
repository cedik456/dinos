import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import type {
  TemplateCreateInput,
  TemplateExerciseInput,
  TemplateListInput,
} from './template.types';

function invalid(message: string): never {
  throw new IdentityException(
    'VALIDATION_FAILED',
    HttpStatus.UNPROCESSABLE_ENTITY,
    message,
  );
}

function text(
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

function single(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    return invalid(`${field} must be provided once.`);
  }
  return value;
}

function parseExercise(value: unknown, index: number): TemplateExerciseInput {
  if (!value || typeof value !== 'object') {
    return invalid(`exercises ${index + 1} is invalid.`);
  }
  const input = value as Record<string, unknown>;
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
    repetitions: text(
      input.repetitions,
      `exercises ${index + 1} repetitions`,
      32,
    )!,
    instruction: text(
      input.instruction,
      `exercises ${index + 1} instruction`,
      1000,
      true,
    ),
  };
}

export function parseTemplateCreate(value: unknown): TemplateCreateInput {
  if (!value || typeof value !== 'object') {
    return invalid('Request body is required.');
  }
  const input = value as Record<string, unknown>;
  if (
    !Array.isArray(input.exercises) ||
    input.exercises.length < 1 ||
    input.exercises.length > 12
  ) {
    return invalid('exercises must contain 1 through 12 items.');
  }
  const exercises = input.exercises.map(parseExercise);
  if (
    new Set(exercises.map((exercise) => exercise.referenceExerciseId)).size !==
    exercises.length
  ) {
    return invalid('Each reference exercise can be selected only once.');
  }
  return {
    name: text(input.name, 'name', 100)!,
    overviewNote: text(input.overviewNote, 'overviewNote', 1000, true),
    exercises,
  };
}

export function parseTemplateList(
  query: Record<string, unknown>,
  allowSearch: boolean,
): TemplateListInput {
  const limitValue = single(query.limit, 'limit');
  const limit = limitValue === undefined ? 20 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return invalid('limit must be an integer from 1 through 50.');
  }
  const search = allowSearch ? single(query.q, 'q') : undefined;
  const normalized = search?.trim() ?? '';
  if ([...normalized].length > 100) return invalid('q is too long.');
  return {
    cursor: single(query.cursor, 'cursor') ?? null,
    limit,
    query: normalized,
  };
}

export function parseTemplateId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return invalid('templateId must be a UUID.');
  }
  return value;
}
