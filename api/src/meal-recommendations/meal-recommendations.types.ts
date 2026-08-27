import type { AccountRole } from '../database/schema';

export const MEAL_KINDS = [
  'breakfast',
  'lunch',
  'snack',
  'dinner',
  'custom',
] as const;

export const MEAL_UNITS = [
  'g',
  'kg',
  'ml',
  'L',
  'pc',
  'pcs',
  'tbsp',
  'tsp',
  'cup',
] as const;

export type MealKind = (typeof MEAL_KINDS)[number];
export type MealUnit = (typeof MEAL_UNITS)[number];

export type MealRecommendationsActor = {
  id: string;
  displayName: string;
  role: AccountRole;
};

export type MealRecommendationsQuery = {
  weekStart: string;
  timeZone: string;
};

export type MealRecommendationItemInput = {
  name: string;
  amount: string;
  unit: MealUnit;
  position: number;
};

export type MealRecommendationMealInput = {
  dayOffset: number;
  kind: MealKind;
  customName: string | null;
  position: number;
  items: MealRecommendationItemInput[];
};

export type MealRecommendationSaveInput = MealRecommendationsQuery & {
  expectedVersion: number | null;
  meals: MealRecommendationMealInput[];
};

export type MealRecommendationDeleteInput = MealRecommendationsQuery & {
  expectedVersion: number;
};

export type MealRecommendationItemDto = MealRecommendationItemInput & {
  id: string;
};

export type MealRecommendationMealDto = Omit<
  MealRecommendationMealInput,
  'items'
> & {
  id: string;
  displayName: string;
  items: MealRecommendationItemDto[];
};

export type MealRecommendationDayDto = {
  date: string;
  dayOffset: number;
  coachDisplayName: string | null;
  sourceVersion: number | null;
  meals: MealRecommendationMealDto[];
};

export type AthleteMealRecommendationsDto = {
  kind: 'athlete';
  week: { startDate: string; endDate: string; timeZone: string };
  athlete: { id: string; displayName: string };
  days: MealRecommendationDayDto[];
};

export type CoachMealRecommendationsDto = {
  kind: 'coach';
  week: { startDate: string; endDate: string; timeZone: string };
  athlete: { id: string; displayName: string };
  coachDisplayName: string;
  version: number | null;
  editable: boolean;
  days: MealRecommendationDayDto[];
};
