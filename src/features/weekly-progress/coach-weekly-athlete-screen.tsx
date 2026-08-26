import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import {
  WeekNavigator,
  WeeklyAthleteRecord,
} from "@/features/weekly-progress/weekly-progress-components";
import {
  addDays,
  currentWeekStart,
  deviceTimeZone,
} from "@/features/weekly-progress/weekly-progress-date";
import { useWeeklyAthleteDetail } from "@/features/weekly-progress/weekly-progress-queries";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";

export function CoachWeeklyAthleteScreen() {
  const params = useLocalSearchParams<{
    athleteAccountId: string;
    offset?: string;
  }>();
  const router = useRouter();
  const { actor, ready } = useWorkoutActor("Coach");
  const offline = useWorkoutOffline();
  const initialOffset = [-1, 0, 1].includes(Number(params.offset))
    ? Number(params.offset)
    : 0;
  const [offset, setOffset] = useState(initialOffset);
  const timeZone = useMemo(deviceTimeZone, []);
  const currentStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const weekStart = addDays(currentStart, offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const query = useWeeklyAthleteDetail(
    actor,
    ready,
    params.athleteAccountId,
    weekStart,
    timeZone,
  );
  const unavailable = offline || query.isError;

  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing Athlete progress" />
      </WorkoutScreen>
    );
  }

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Athlete report"
        title={query.data?.athlete.displayName ?? "Weekly progress"}
        description="Review the same dated coaching record your Athlete sees."
      />
      <WeekNavigator
        offset={offset}
        startDate={weekStart}
        endDate={weekEnd}
        onChange={setOffset}
      />
      {query.isPending && !query.data && !unavailable ? (
        <WorkoutLoading label="Loading Athlete progress" />
      ) : null}
      {unavailable && !query.data ? (
        <WorkoutMessage
          tone="error"
          title="Athlete progress unavailable"
          message="Dino could not load this private weekly record."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unavailable && query.data ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved record"
          message="Refresh before reviewing or following up."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <WeeklyAthleteRecord
          detail={query.data}
          onOpenWorkout={(id) => router.push(`/coach/programs/${id}`)}
        />
      ) : null}
    </WorkoutScreen>
  );
}
