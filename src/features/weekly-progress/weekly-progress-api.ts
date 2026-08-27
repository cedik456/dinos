import type { WorkoutStatus } from "@/features/workouts/workout-api";
import { workoutRequest } from "@/features/workouts/workout-api";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

export type WeeklyDayState =
  "rest" | "scheduled" | "today" | "missed" | "awaiting_review" | "reviewed";

export type WeeklySummary = {
  assignedCount: number;
  dueCount: number;
  completedCount: number;
  awaitingReviewCount: number;
  reviewedCount: number;
  missedCount: number;
  progressPercent: number | null;
};

export type WeeklyAthleteDetail = {
  kind: "athlete";
  week: { startDate: string; endDate: string; timeZone: string };
  athlete: { id: string; displayName: string };
  summary: WeeklySummary;
  days: {
    date: string;
    state: WeeklyDayState;
    workout: { id: string; title: string; status: WorkoutStatus } | null;
  }[];
};

export type WeeklyCoachOverview = {
  kind: "coach";
  week: { startDate: string; endDate: string; timeZone: string };
  summary: WeeklySummary & { activeAthleteCount: number };
  items: {
    athlete: { id: string; displayName: string };
    summary: WeeklySummary;
  }[];
  nextCursor: string | null;
};

export type WeeklyActorResponse = WeeklyAthleteDetail | WeeklyCoachOverview;

export type WeeklyProgressFilters = {
  weekStart: string;
  timeZone: string;
  cursor?: string;
  limit?: number;
};

function queryString(filters: WeeklyProgressFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (value !== undefined) params.set(key, String(value));
  }
  return `?${params.toString()}`;
}

export const weeklyProgressApi = {
  forActor: (
    actor: WorkoutActor,
    filters: WeeklyProgressFilters,
    signal?: AbortSignal,
  ) =>
    workoutRequest<WeeklyActorResponse>(
      actor,
      `/weekly-progress${queryString(filters)}`,
      { signal },
    ),
  athleteForCoach: (
    actor: WorkoutActor,
    athleteAccountId: string,
    filters: WeeklyProgressFilters,
    signal?: AbortSignal,
  ) =>
    workoutRequest<WeeklyAthleteDetail>(
      actor,
      `/weekly-progress/athletes/${athleteAccountId}${queryString(filters)}`,
      { signal },
    ),
};
