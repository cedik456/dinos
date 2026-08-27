import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mealRecommendationsApi,
  type MealRecommendationFilters,
  type MealRecommendationSave,
} from "@/features/meal-recommendations/meal-recommendations-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export const mealRecommendationKeys = {
  all: ["mealRecommendations"] as const,
  root: (actor: WorkoutActor) =>
    [...mealRecommendationKeys.all, actor.accountId, actor.role] as const,
  athlete: (actor: WorkoutActor, weekStart: string, timeZone: string) =>
    [
      ...mealRecommendationKeys.root(actor),
      "athlete",
      weekStart,
      timeZone,
    ] as const,
  coach: (
    actor: WorkoutActor,
    athleteAccountId: string,
    weekStart: string,
    timeZone: string,
  ) =>
    [
      ...mealRecommendationKeys.root(actor),
      "coach",
      athleteAccountId,
      weekStart,
      timeZone,
    ] as const,
};

export function useAthleteMealRecommendations(
  actor: WorkoutActor | null,
  ready: boolean,
  filters: MealRecommendationFilters,
) {
  return useQuery({
    queryKey: actor
      ? mealRecommendationKeys.athlete(
          actor,
          filters.weekStart,
          filters.timeZone,
        )
      : ["mealRecommendations", "unavailable", filters.weekStart],
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("Athlete account unavailable.");
      return mealRecommendationsApi.athlete(actor, filters, signal);
    },
    enabled: Boolean(actor && ready),
  });
}

export function useCoachMealRecommendations(
  actor: WorkoutActor | null,
  ready: boolean,
  athleteAccountId: string | null,
  filters: MealRecommendationFilters,
) {
  return useQuery({
    queryKey:
      actor && athleteAccountId
        ? mealRecommendationKeys.coach(
            actor,
            athleteAccountId,
            filters.weekStart,
            filters.timeZone,
          )
        : ["mealRecommendations", "unavailable", filters.weekStart],
    queryFn: ({ signal }) => {
      if (!actor || !athleteAccountId)
        throw new Error("Coach meal plan target unavailable.");
      return mealRecommendationsApi.coach(
        actor,
        athleteAccountId,
        filters,
        signal,
      );
    },
    enabled: Boolean(actor && ready && athleteAccountId),
  });
}

function useRefreshMealRecommendations() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: mealRecommendationKeys.all });
}

export function useSaveMealRecommendations(
  actor: WorkoutActor,
  athleteAccountId: string,
) {
  const refresh = useRefreshMealRecommendations();
  return useMutation({
    mutationFn: (input: MealRecommendationSave) =>
      mealRecommendationsApi.save(actor, athleteAccountId, input),
    onSuccess: refresh,
  });
}

export function useDeleteMealRecommendations(
  actor: WorkoutActor,
  athleteAccountId: string,
) {
  const refresh = useRefreshMealRecommendations();
  return useMutation({
    mutationFn: (
      input: MealRecommendationFilters & { expectedVersion: number },
    ) => mealRecommendationsApi.remove(actor, athleteAccountId, input),
    onSuccess: refresh,
  });
}
