import { workoutRequest } from "@/features/workouts/workout-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export const MEAL_KINDS = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "custom",
] as const;

export const MEAL_UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "pc",
  "pcs",
  "tbsp",
  "tsp",
  "cup",
] as const;

export type MealKind = (typeof MEAL_KINDS)[number];
export type MealUnit = (typeof MEAL_UNITS)[number];

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

export type MealRecommendationItem = MealRecommendationItemInput & {
  id: string;
};

export type MealRecommendationMeal = Omit<
  MealRecommendationMealInput,
  "items"
> & {
  id: string;
  displayName: string;
  items: MealRecommendationItem[];
};

export type MealRecommendationDay = {
  date: string;
  dayOffset: number;
  coachDisplayName: string | null;
  sourceVersion: number | null;
  meals: MealRecommendationMeal[];
};

type MealWeek = {
  week: { startDate: string; endDate: string; timeZone: string };
  athlete: { id: string; displayName: string };
  days: MealRecommendationDay[];
};

export type AthleteMealRecommendations = MealWeek & { kind: "athlete" };

export type CoachMealRecommendations = MealWeek & {
  kind: "coach";
  coachDisplayName: string;
  version: number | null;
  editable: boolean;
};

export type MealRecommendationFilters = {
  weekStart: string;
  timeZone: string;
};

export type MealRecommendationSave = MealRecommendationFilters & {
  expectedVersion: number | null;
  meals: MealRecommendationMealInput[];
};

function queryString(filters: MealRecommendationFilters) {
  const params = new URLSearchParams();
  params.set("timeZone", filters.timeZone);
  params.set("weekStart", filters.weekStart);
  return `?${params.toString()}`;
}

export const mealRecommendationsApi = {
  athlete: (
    actor: WorkoutActor,
    filters: MealRecommendationFilters,
    signal?: AbortSignal,
  ) =>
    workoutRequest<AthleteMealRecommendations>(
      actor,
      `/meal-recommendations${queryString(filters)}`,
      { signal },
    ),
  coach: (
    actor: WorkoutActor,
    athleteAccountId: string,
    filters: MealRecommendationFilters,
    signal?: AbortSignal,
  ) =>
    workoutRequest<CoachMealRecommendations>(
      actor,
      `/meal-recommendations/athletes/${athleteAccountId}${queryString(filters)}`,
      { signal },
    ),
  save: (
    actor: WorkoutActor,
    athleteAccountId: string,
    input: MealRecommendationSave,
  ) =>
    workoutRequest<CoachMealRecommendations>(
      actor,
      `/meal-recommendations/athletes/${athleteAccountId}`,
      { method: "PUT", body: input },
    ),
  remove: (
    actor: WorkoutActor,
    athleteAccountId: string,
    input: MealRecommendationFilters & { expectedVersion: number },
  ) =>
    workoutRequest<void>(
      actor,
      `/meal-recommendations/athletes/${athleteAccountId}`,
      { method: "DELETE", body: input },
    ),
};
