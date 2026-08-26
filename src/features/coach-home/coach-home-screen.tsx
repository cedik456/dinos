import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen, ScreenError, ScreenLoading } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { getCoachHome } from "@/data/mock/dashboards";
import { CoachWeeklySummary } from "@/features/coach-home/components/coach-weekly-summary";
import { CoachAwaitingReview } from "@/features/workouts/coach-awaiting-review";
import { useAsyncData } from "@/hooks/use-async-data";
import { colors, radii, spacing } from "@/theme/tokens";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import {
  currentWeekStart,
  deviceTimeZone,
} from "@/features/weekly-progress/weekly-progress-date";
import { useWeeklyActor } from "@/features/weekly-progress/weekly-progress-queries";

export function CoachHomeScreen() {
  const router = useRouter();
  const { actor, ready } = useWorkoutActor("Coach");
  const offline = useWorkoutOffline();
  const timeZone = useMemo(deviceTimeZone, []);
  const weekStart = useMemo(() => currentWeekStart(timeZone), [timeZone]);
  const weekly = useWeeklyActor(actor, ready, weekStart, timeZone);
  const overview = weekly.data?.kind === "coach" ? weekly.data : undefined;
  const weeklyUnavailable = offline || weekly.isError;
  const { data, error, loading, retry } = useAsyncData(getCoachHome);

  if (loading) {
    return (
      <Screen hasFloatingTabs>
        <ScreenLoading label="Loading coach preview" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen hasFloatingTabs>
        <ScreenError
          message={error?.message ?? "No preview data found."}
          onRetry={retry}
        />
      </Screen>
    );
  }

  return (
    <Screen hasFloatingTabs contentContainerStyle={styles.screen}>
      <PageHeader
        greeting={`Good morning, ${data.coach.firstName}`}
        context={data.context}
      />

      {weekly.isPending && !overview && !weeklyUnavailable ? (
        <ScreenLoading label="Loading Coach week" />
      ) : null}

      {weeklyUnavailable ? (
        <Card style={styles.summaryError}>
          <Text variant="heading">
            {overview
              ? "Showing the last saved week"
              : "Coach week unavailable"}
          </Text>
          <Text tone="muted">Dino could not refresh this roster summary.</Text>
          <Button
            label="Retry"
            variant="secondary"
            onPress={() => void weekly.refetch()}
          />
        </Card>
      ) : null}

      {overview ? (
        <Card tone="accent" style={styles.rosterCard}>
          <View style={styles.rosterCopy}>
            <Text variant="caption" tone="accent">
              ACTIVE ROSTER
            </Text>
            <Text
              accessibilityLabel={`${overview.summary.activeAthleteCount} active athletes`}
              variant="display"
            >
              {overview.summary.activeAthleteCount}
            </Text>
            <Text tone="muted">athletes currently in coaching</Text>
          </View>
          <View style={styles.rosterIcon}>
            <Icon
              name={{ ios: "person.2.fill", android: "group", web: "group" }}
              size={28}
              weight="semibold"
              tintColor={colors.accent}
            />
          </View>
        </Card>
      ) : null}

      {overview ? <CoachWeeklySummary summary={overview.summary} /> : null}
      <CoachAwaitingReview />
      <Button
        label="View all athletes"
        variant="secondary"
        trailingArrow
        onPress={() => router.push("/coach/athletes")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xxl,
  },
  rosterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xl,
    padding: spacing.xl,
  },
  rosterCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rosterIcon: {
    width: 58,
    height: 58,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryError: { gap: spacing.md },
});
