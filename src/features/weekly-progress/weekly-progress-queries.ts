import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  weeklyProgressApi,
  type WeeklyAthleteDetail,
  type WeeklyCoachOverview,
} from "@/features/weekly-progress/weekly-progress-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export const weeklyProgressKeys = {
  root: (actor: WorkoutActor) =>
    ["weeklyProgress", actor.accountId, actor.role] as const,
  actor: (actor: WorkoutActor, weekStart: string, timeZone: string) =>
    [...weeklyProgressKeys.root(actor), "actor", weekStart, timeZone] as const,
  coachOverview: (actor: WorkoutActor, weekStart: string, timeZone: string) =>
    [
      ...weeklyProgressKeys.root(actor),
      "coachOverview",
      weekStart,
      timeZone,
    ] as const,
  athlete: (
    actor: WorkoutActor,
    athleteAccountId: string,
    weekStart: string,
    timeZone: string,
  ) =>
    [
      ...weeklyProgressKeys.root(actor),
      "athlete",
      athleteAccountId,
      weekStart,
      timeZone,
    ] as const,
};

export function useWeeklyActor(
  actor: WorkoutActor | null,
  ready: boolean,
  weekStart: string,
  timeZone: string,
) {
  return useQuery({
    queryKey: actor
      ? weeklyProgressKeys.actor(actor, weekStart, timeZone)
      : ["weeklyProgress", "unavailable", weekStart, timeZone],
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("Workout actor unavailable.");
      return weeklyProgressApi.forActor(actor, { weekStart, timeZone }, signal);
    },
    enabled: Boolean(actor && ready && weekStart && timeZone),
  });
}

export function useCoachWeeklyOverview(
  actor: WorkoutActor | null,
  ready: boolean,
  weekStart: string,
  timeZone: string,
) {
  return useInfiniteQuery<WeeklyCoachOverview>({
    queryKey: actor
      ? weeklyProgressKeys.coachOverview(actor, weekStart, timeZone)
      : ["weeklyProgress", "unavailable", weekStart, timeZone],
    queryFn: async ({ pageParam, signal }) => {
      if (!actor) throw new Error("Workout actor unavailable.");
      const response = await weeklyProgressApi.forActor(
        actor,
        {
          weekStart,
          timeZone,
          ...(typeof pageParam === "string" ? { cursor: pageParam } : {}),
        },
        signal,
      );
      if (response.kind !== "coach")
        throw new Error("Coach report unavailable.");
      return response;
    },
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(actor && ready && weekStart && timeZone),
  });
}

export function useWeeklyAthleteDetail(
  actor: WorkoutActor | null,
  ready: boolean,
  athleteAccountId: string,
  weekStart: string,
  timeZone: string,
) {
  return useQuery<WeeklyAthleteDetail>({
    queryKey: actor
      ? weeklyProgressKeys.athlete(actor, athleteAccountId, weekStart, timeZone)
      : [
          "weeklyProgress",
          "unavailable",
          athleteAccountId,
          weekStart,
          timeZone,
        ],
    queryFn: ({ signal }) => {
      if (!actor) throw new Error("Workout actor unavailable.");
      return weeklyProgressApi.athleteForCoach(
        actor,
        athleteAccountId,
        { weekStart, timeZone },
        signal,
      );
    },
    enabled: Boolean(
      actor && ready && athleteAccountId && weekStart && timeZone,
    ),
  });
}
