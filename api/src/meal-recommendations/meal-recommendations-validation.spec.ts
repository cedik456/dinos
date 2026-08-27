import { IdentityException } from '../identity/identity-errors';
import {
  parseMealRecommendationsDelete,
  parseMealRecommendationsQuery,
  parseMealRecommendationsSave,
} from './meal-recommendations-validation';

const validMeal = {
  dayOffset: 0,
  kind: 'breakfast',
  customName: null,
  position: 0,
  items: [{ name: ' Oats ', amount: '80.500', unit: 'g', position: 0 }],
};

function expectValidation(action: () => unknown, message: string) {
  try {
    action();
    throw new Error('Expected validation to fail.');
  } catch (error) {
    expect(error).toBeInstanceOf(IdentityException);
    expect((error as IdentityException).getStatus()).toBe(422);
    expect((error as Error).message).toContain(message);
  }
}

describe('meal recommendation validation', () => {
  it('normalizes a complete weekly save', () => {
    expect(
      parseMealRecommendationsSave({
        weekStart: '2026-08-24',
        timeZone: 'Asia/Manila',
        expectedVersion: null,
        meals: [validMeal],
      }),
    ).toEqual({
      weekStart: '2026-08-24',
      timeZone: 'Asia/Manila',
      expectedVersion: null,
      meals: [
        {
          ...validMeal,
          items: [{ name: 'Oats', amount: '80.5', unit: 'g', position: 0 }],
        },
      ],
    });
  });

  it('requires a Monday and a valid device time zone', () => {
    expectValidation(
      () =>
        parseMealRecommendationsQuery({
          weekStart: '2026-08-25',
          timeZone: 'Asia/Manila',
        }),
      'Monday',
    );
    expectValidation(
      () =>
        parseMealRecommendationsQuery({
          weekStart: '2026-08-24',
          timeZone: 'Dino/Nowhere',
        }),
      'IANA',
    );
  });

  it('rejects an empty save, invalid amounts, and duplicate meal names', () => {
    expectValidation(
      () =>
        parseMealRecommendationsSave({
          weekStart: '2026-08-24',
          timeZone: 'Asia/Manila',
          expectedVersion: null,
          meals: [],
        }),
      '1 through 56',
    );
    expectValidation(
      () =>
        parseMealRecommendationsSave({
          weekStart: '2026-08-24',
          timeZone: 'Asia/Manila',
          expectedVersion: null,
          meals: [
            {
              ...validMeal,
              items: [{ ...validMeal.items[0], amount: '0' }],
            },
          ],
        }),
      'greater than zero',
    );
    expectValidation(
      () =>
        parseMealRecommendationsSave({
          weekStart: '2026-08-24',
          timeZone: 'Asia/Manila',
          expectedVersion: null,
          meals: [validMeal, { ...validMeal, position: 1 }],
        }),
      'unique',
    );
  });

  it('requires a positive exact version for deletion', () => {
    expectValidation(
      () =>
        parseMealRecommendationsDelete({
          weekStart: '2026-08-24',
          timeZone: 'Asia/Manila',
          expectedVersion: null,
        }),
      'positive integer',
    );
  });
});
