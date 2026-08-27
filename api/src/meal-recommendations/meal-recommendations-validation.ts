import { HttpStatus } from '@nestjs/common';
import { IdentityException } from '../identity/identity-errors';
import { parseIsoDate } from '../workouts/workout-validation';
import type {
  MealKind,
  MealRecommendationDeleteInput,
  MealRecommendationItemInput,
  MealRecommendationMealInput,
  MealRecommendationsQuery,
  MealRecommendationSaveInput,
  MealUnit,
} from './meal-recommendations.types';
import { MEAL_KINDS, MEAL_UNITS } from './meal-recommendations.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,6})(?:\.\d{1,3})?$/;

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

function normalizedText(value: unknown, field: string, maximum: number) {
  if (typeof value !== 'string') return invalid(`${field} must be text.`);
  const normalized = value.trim();
  if (!normalized) return invalid(`${field} is required.`);
  if ([...normalized].length > maximum) {
    return invalid(`${field} is too long.`);
  }
  return normalized;
}

function parseMonday(value: unknown): string {
  const weekStart = parseIsoDate(value, 'weekStart');
  const [year, month, day] = weekStart.split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 1) {
    return invalid('weekStart must be a Monday.');
  }
  return weekStart;
}

function parseTimeZone(value: unknown): string {
  if (typeof value !== 'string' || value.length > 64 || !value.trim()) {
    return invalid('timeZone must be a valid IANA time zone.');
  }
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: value,
    }).resolvedOptions().timeZone;
  } catch {
    return invalid('timeZone must be a valid IANA time zone.');
  }
}

function parseExpectedVersion(
  value: unknown,
  nullable: boolean,
): number | null {
  if (nullable && value === null) return null;
  if (!Number.isInteger(value) || Number(value) < 1) {
    return invalid(
      nullable
        ? 'expectedVersion must be a positive integer or null.'
        : 'expectedVersion must be a positive integer.',
    );
  }
  return Number(value);
}

function parseAmount(value: unknown, field: string): string {
  if (typeof value !== 'string' || !AMOUNT_PATTERN.test(value)) {
    return invalid(`${field} must be a positive decimal with up to 3 places.`);
  }
  const [whole, fraction = ''] = value.split('.');
  const thousandths = Number(whole) * 1000 + Number(fraction.padEnd(3, '0'));
  if (thousandths <= 0) {
    return invalid(`${field} must be greater than zero.`);
  }
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction
    ? `${Number(whole)}.${trimmedFraction}`
    : `${Number(whole)}`;
}

function parsePosition(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    return invalid(`${field} must be a nonnegative integer.`);
  }
  return Number(value);
}

function parseItem(
  value: unknown,
  mealIndex: number,
  itemIndex: number,
): MealRecommendationItemInput {
  if (!value || typeof value !== 'object') {
    return invalid(`meals ${mealIndex + 1} item ${itemIndex + 1} is invalid.`);
  }
  const input = value as Record<string, unknown>;
  const unit = input.unit;
  if (typeof unit !== 'string' || !MEAL_UNITS.includes(unit as MealUnit)) {
    return invalid(
      `meals ${mealIndex + 1} item ${itemIndex + 1} unit is invalid.`,
    );
  }
  return {
    name: normalizedText(
      input.name,
      `meals ${mealIndex + 1} item ${itemIndex + 1} name`,
      100,
    ),
    amount: parseAmount(
      input.amount,
      `meals ${mealIndex + 1} item ${itemIndex + 1} amount`,
    ),
    unit: unit as MealUnit,
    position: parsePosition(
      input.position,
      `meals ${mealIndex + 1} item ${itemIndex + 1} position`,
    ),
  };
}

function displayName(meal: MealRecommendationMealInput): string {
  return meal.kind === 'custom' ? meal.customName! : meal.kind;
}

function parseMeals(value: unknown): MealRecommendationMealInput[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 56) {
    return invalid('meals must contain 1 through 56 items.');
  }
  const meals = value.map((entry, mealIndex) => {
    if (!entry || typeof entry !== 'object') {
      return invalid(`meals ${mealIndex + 1} is invalid.`);
    }
    const input = entry as Record<string, unknown>;
    if (
      !Number.isInteger(input.dayOffset) ||
      Number(input.dayOffset) < 0 ||
      Number(input.dayOffset) > 6
    ) {
      return invalid(
        `meals ${mealIndex + 1} dayOffset must be from 0 through 6.`,
      );
    }
    const kind = input.kind;
    if (typeof kind !== 'string' || !MEAL_KINDS.includes(kind as MealKind)) {
      return invalid(`meals ${mealIndex + 1} kind is invalid.`);
    }
    const customName =
      kind === 'custom'
        ? normalizedText(
            input.customName,
            `meals ${mealIndex + 1} customName`,
            60,
          )
        : null;
    if (kind !== 'custom' && input.customName != null) {
      return invalid(
        `meals ${mealIndex + 1} customName is only for custom meals.`,
      );
    }
    if (!Array.isArray(input.items) || input.items.length > 20) {
      return invalid(
        `meals ${mealIndex + 1} items must contain at most 20 items.`,
      );
    }
    const items = input.items.map((item, itemIndex) =>
      parseItem(item, mealIndex, itemIndex),
    );
    const sortedItemPositions = items
      .map((item) => item.position)
      .sort((left, right) => left - right);
    if (sortedItemPositions.some((position, index) => position !== index)) {
      return invalid(
        `meals ${mealIndex + 1} item positions must be consecutive.`,
      );
    }
    return {
      dayOffset: Number(input.dayOffset),
      kind: kind as MealKind,
      customName,
      position: parsePosition(
        input.position,
        `meals ${mealIndex + 1} position`,
      ),
      items: items.sort((left, right) => left.position - right.position),
    };
  });

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dayMeals = meals.filter((meal) => meal.dayOffset === dayOffset);
    if (dayMeals.length > 8) {
      return invalid(`day ${dayOffset + 1} must contain at most 8 meals.`);
    }
    const positions = dayMeals
      .map((meal) => meal.position)
      .sort((left, right) => left - right);
    if (positions.some((position, index) => position !== index)) {
      return invalid(
        `day ${dayOffset + 1} meal positions must be consecutive.`,
      );
    }
    const names = new Set<string>();
    for (const meal of dayMeals) {
      const name = displayName(meal).toLocaleLowerCase('en-US');
      if (names.has(name)) {
        return invalid(`day ${dayOffset + 1} meal names must be unique.`);
      }
      names.add(name);
    }
  }

  return meals.sort(
    (left, right) =>
      left.dayOffset - right.dayOffset || left.position - right.position,
  );
}

export function parseMealRecommendationsQuery(
  query: Record<string, unknown>,
): MealRecommendationsQuery {
  return {
    weekStart: parseMonday(single(query.weekStart, 'weekStart')),
    timeZone: parseTimeZone(single(query.timeZone, 'timeZone')),
  };
}

export function parseMealRecommendationsSave(
  body: unknown,
): MealRecommendationSaveInput {
  if (!body || typeof body !== 'object') {
    return invalid('Request body is required.');
  }
  const input = body as Record<string, unknown>;
  return {
    weekStart: parseMonday(input.weekStart),
    timeZone: parseTimeZone(input.timeZone),
    expectedVersion: parseExpectedVersion(input.expectedVersion, true),
    meals: parseMeals(input.meals),
  };
}

export function parseMealRecommendationsDelete(
  body: unknown,
): MealRecommendationDeleteInput {
  if (!body || typeof body !== 'object') {
    return invalid('Request body is required.');
  }
  const input = body as Record<string, unknown>;
  return {
    weekStart: parseMonday(input.weekStart),
    timeZone: parseTimeZone(input.timeZone),
    expectedVersion: parseExpectedVersion(input.expectedVersion, false)!,
  };
}

export function parseMealAthleteAccountId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    return invalid('athleteAccountId must be a UUID.');
  }
  return value;
}
