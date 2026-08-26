import { useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { Pressable, Text, View } from "@/components/ui/tw";
import {
  WeekNavigator,
  WeeklySummaryCard,
} from "@/features/weekly-progress/weekly-progress-components";
import {
  addDays,
  currentWeekStart,
  deviceTimeZone,
} from "@/features/weekly-progress/weekly-progress-date";
import { useCoachWeeklyOverview } from "@/features/weekly-progress/weekly-progress-queries";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  WorkoutButton,
  WorkoutCard,
  WorkoutHeader,
  WorkoutLoading,
  WorkoutMessage,
  WorkoutScreen,
} from "@/features/workouts/components/workout-ui";

export function CoachReportsScreen() {
  const router = useRouter();
  const { actor, ready } = useWorkoutActor("Coach");
  const offline = useWorkoutOffline();
  const [offset, setOffset] = useState(0);
  const timeZone = useMemo(deviceTimeZone, []);
  const currentStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const weekStart = addDays(currentStart, offset * 7);
  const weekEnd = addDays(weekStart, 6);
  const query = useCoachWeeklyOverview(actor, ready, weekStart, timeZone);
  const pages = query.data?.pages;
  const rows = useMemo(
    () => pages?.flatMap((page) => page.items) ?? [],
    [pages],
  );
  const overview = pages?.[0];
  const unavailable = offline || query.isError;

  if (!actor || !ready) {
    return (
      <WorkoutScreen>
        <WorkoutLoading label="Preparing Coach reports" />
      </WorkoutScreen>
    );
  }

  return (
    <WorkoutScreen>
      <WorkoutHeader
        eyebrow="Coach reports"
        title="Roster week"
        description="Start with completed work awaiting your review, then follow up on missed sessions."
      />
      <WeekNavigator
        offset={offset}
        startDate={weekStart}
        endDate={weekEnd}
        onChange={setOffset}
      />
      {query.isPending && !overview && !unavailable ? (
        <WorkoutLoading label="Loading roster progress" />
      ) : null}
      {unavailable && !overview ? (
        <WorkoutMessage
          tone="error"
          title="Roster report unavailable"
          message="Dino could not load this week. No workout status has changed."
          actionLabel="Try again"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {unavailable && overview ? (
        <WorkoutMessage
          tone="stale"
          title="Showing the last saved report"
          message="This roster summary may be out of date. Refresh before following up."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {overview ? (
        <>
          <WorkoutCard className="flex-row items-center justify-between bg-accent-soft">
            <View className="gap-xs">
              <Text className="font-sans text-caption font-semibold uppercase tracking-widest text-accent-foreground">
                Active roster
              </Text>
              <Text className="font-sans text-display font-bold text-foreground">
                {overview.summary.activeAthleteCount}
              </Text>
            </View>
            <Text className="max-w-48 text-right font-sans text-body text-muted">
              Athletes in your private coaching roster
            </Text>
          </WorkoutCard>
          <WeeklySummaryCard
            title="Across your roster"
            summary={overview.summary}
          />
          {rows.length === 0 ? (
            <WorkoutMessage
              title="No active Athletes"
              message="Accepted Athlete invitations will appear in this weekly report."
            />
          ) : (
            <View className="gap-md">
              <Text className="font-sans text-heading font-bold text-foreground">
                Athlete status
              </Text>
              {rows.map((row) => (
                <Pressable
                  key={row.athlete.id}
                  accessibilityLabel={`Open ${row.athlete.displayName} weekly progress`}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/coach/reports/[athleteAccountId]",
                      params: {
                        athleteAccountId: row.athlete.id,
                        offset: String(offset),
                      },
                    })
                  }
                  className="active:opacity-80"
                >
                  <WorkoutCard>
                    <View className="flex-row items-start justify-between gap-md">
                      <View className="flex-1 gap-xs">
                        <Text className="font-sans text-body font-semibold text-foreground">
                          {row.athlete.displayName}
                        </Text>
                        <Text className="font-sans text-caption text-muted">
                          {row.summary.completedCount} of {row.summary.dueCount}{" "}
                          due complete
                        </Text>
                      </View>
                      <Text className="font-sans text-label font-semibold text-accent-foreground">
                        {row.summary.progressPercent === null
                          ? "No workouts due"
                          : `${row.summary.progressPercent}%`}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-md">
                      <Text className="font-sans text-caption font-semibold text-warning">
                        {row.summary.awaitingReviewCount} awaiting review
                      </Text>
                      <Text className="font-sans text-caption font-semibold text-danger">
                        {row.summary.missedCount} missed
                      </Text>
                      <Text className="font-sans text-caption font-semibold text-success">
                        {row.summary.reviewedCount} reviewed
                      </Text>
                    </View>
                  </WorkoutCard>
                </Pressable>
              ))}
              {query.hasNextPage ? (
                <WorkoutButton
                  label={query.isFetchingNextPage ? "Loading…" : "Load more"}
                  variant="secondary"
                  disabled={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                />
              ) : null}
            </View>
          )}
        </>
      ) : null}
    </WorkoutScreen>
  );
}
