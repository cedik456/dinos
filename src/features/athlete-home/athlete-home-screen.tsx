import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PageHeader } from "@/components/shell/page-header";
import { MetricTile } from "@/components/ui/metric-tile";
import { Screen, ScreenError, ScreenLoading } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { getAthleteHome } from "@/data/mock/dashboards";
import { TodayWorkoutCard } from "@/features/athlete-home/components/today-workout-card";
import { WeekStatusStrip } from "@/features/athlete-home/components/week-status-strip";
import { WeeklyProgressCard } from "@/features/athlete-home/components/weekly-progress-card";
import { useAsyncData } from "@/hooks/use-async-data";
import { spacing } from "@/theme/tokens";

export function AthleteHomeScreen() {
  const router = useRouter();
  const { data, error, loading, retry } = useAsyncData(getAthleteHome);

  if (loading) {
    return (
      <Screen hasFloatingTabs>
        <ScreenLoading label="Loading athlete preview" />
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
        greeting={`Good morning, ${data.athlete.firstName}`}
        context={data.context}
        initials={data.athlete.initials}
        profileLabel={`${data.athlete.firstName} profile`}
      />

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="heading">This week</Text>
          <Text variant="caption" tone="muted">
            10–16 Aug
          </Text>
        </View>
        <WeekStatusStrip days={data.week} />
      </View>

      <TodayWorkoutCard
        workout={data.workout}
        onViewPlan={() => router.push("/athlete/plan")}
      />

      <View style={styles.section}>
        <Text variant="heading">Today at a glance</Text>
        <View style={styles.metricsGrid}>
          <MetricTile
            label="Nutrition"
            value={`${data.nutrition.calories.toLocaleString()} kcal`}
            detail={`of ${data.nutrition.calorieTarget.toLocaleString()} target`}
            tone="accent"
            style={styles.metricHalf}
          />
          <MetricTile
            label="Protein"
            value={`${data.nutrition.protein} g`}
            detail={`of ${data.nutrition.proteinTarget} g target`}
            style={styles.metricHalf}
          />
          <MetricTile
            label="Sleep"
            value={`${data.sleepHours.toFixed(1)} h`}
            detail="Last night"
            style={styles.metricHalf}
          />
          <MetricTile
            label="Body weight"
            value={`${data.weightKg.toFixed(1)} kg`}
            detail="Latest check-in"
            style={styles.metricHalf}
          />
        </View>
      </View>

      <WeeklyProgressCard progress={data.weeklyProgress} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.xxl,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricHalf: {
    flexGrow: 1,
    flexBasis: "46%",
  },
});
