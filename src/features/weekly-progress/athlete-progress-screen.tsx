import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import {
  addDays,
  currentWeekStart,
  deviceTimeZone,
} from "@/features/weekly-progress/weekly-progress-date";
import {
  WeekNavigator,
  WeeklyAthleteRecord,
} from "@/features/weekly-progress/weekly-progress-components";
import { useWeeklyActor } from "@/features/weekly-progress/weekly-progress-queries";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";

export function AthleteProgressScreen() {
  const router = useRouter();
  const { actor, ready } = useWorkoutActor("Athlete");
  const offline = useWorkoutOffline();
  const [offset, setOffset] = useState(0);
  const timeZone = useMemo(deviceTimeZone, []);
  const currentStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const weekStart = addDays(currentStart, offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const query = useWeeklyActor(actor, ready, weekStart, timeZone);
  const detail = query.data?.kind === "athlete" ? query.data : undefined;
  const unavailable = offline || query.isError;

  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing weekly progress" />
      </WorkoutScreen>
    );
  }

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Athlete progress"
        title="Your training week"
        description="See what is due, what you completed, and what your Coach has reviewed."
      />
      <WeekNavigator
        offset={offset}
        startDate={weekStart}
        endDate={weekEnd}
        onChange={setOffset}
      />
      {query.isPending && !detail && !unavailable ? (
        <WorkoutLoading label="Loading your training week" />
      ) : null}
      {unavailable && !detail ? (
        <WorkoutMessage
          tone="error"
          title="Weekly progress unavailable"
          message="Dino could not load this week. No workout status has changed."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unavailable && detail ? (
        <WorkoutMessage
          tone="stale"
          title="Showing your last saved week"
          message="This record may be out of date. Refresh when your connection returns."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {detail ? (
        <WeeklyAthleteRecord
          detail={detail}
          onOpenWorkout={(id) => router.push(`/athlete/plan/${id}`)}
        />
      ) : null}
    </WorkoutScreen>
  );
}
