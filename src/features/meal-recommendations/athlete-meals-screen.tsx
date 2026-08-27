import { useEffect, useMemo, useState } from "react";

import {
  MealDailyReadView,
  MealDaySelector,
  MealSelectedDayHeader,
  MealWeekNavigator,
} from "@/features/meal-recommendations/meal-recommendations-components";
import { useAthleteMealRecommendations } from "@/features/meal-recommendations/meal-recommendations-queries";
import {
  addDays,
  currentWeekStart,
  deviceTimeZone,
  localIsoDate,
} from "@/features/weekly-progress/weekly-progress-date";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";

function selectedDayForWeek(weekStart: string, timeZone: string): number {
  const today = localIsoDate(new Date(), timeZone);
  const weekEnd = addDays(weekStart, 6);
  if (today < weekStart || today > weekEnd) return 0;
  const start = new Date(`${weekStart}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((current - start) / 86_400_000);
}

export function AthleteMealsScreen() {
  const { actor, ready } = useWorkoutActor("Athlete");
  const offline = useWorkoutOffline();
  const timeZone = useMemo(deviceTimeZone, []);
  const currentStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const [offset, setOffset] = useState(0);
  const weekStart = addDays(currentStart, offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const [selectedDay, setSelectedDay] = useState(() =>
    selectedDayForWeek(weekStart, timeZone),
  );
  const query = useAthleteMealRecommendations(actor, ready, {
    weekStart,
    timeZone,
  });
  const unavailable = offline || query.isError;

  useEffect(() => {
    setSelectedDay(selectedDayForWeek(weekStart, timeZone));
  }, [timeZone, weekStart]);

  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing meal recommendations" />
      </WorkoutScreen>
    );
  }

  const day = query.data?.days[selectedDay];
  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Meal recommendations"
        title="Your daily guidance"
        description="Read what your Coach recommends for the day. Meals are guidance, not tasks to complete."
      />
      <MealWeekNavigator
        startDate={weekStart}
        endDate={weekEnd}
        offset={offset}
        minimumOffset={-1}
        maximumOffset={1}
        onChange={setOffset}
      />
      <MealDaySelector
        weekStart={weekStart}
        selectedDay={selectedDay}
        onSelect={setSelectedDay}
      />
      <MealSelectedDayHeader
        date={addDays(weekStart, selectedDay)}
        previousDisabled={selectedDay === 0}
        nextDisabled={selectedDay === 6}
        onPrevious={() => setSelectedDay((value) => Math.max(0, value - 1))}
        onNext={() => setSelectedDay((value) => Math.min(6, value + 1))}
      />

      {query.isPending && !query.data && !unavailable ? (
        <WorkoutLoading label="Loading this meal recommendation week" />
      ) : null}
      {unavailable && !query.data ? (
        <WorkoutMessage
          tone="error"
          title="Meal recommendations unavailable"
          message="Dino could not load this week. Nothing has changed."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unavailable && query.data ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved recommendations"
          message="This week may be out of date. Refresh when your connection returns."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {day ? <MealDailyReadView day={day} /> : null}
    </WorkoutScreen>
  );
}
