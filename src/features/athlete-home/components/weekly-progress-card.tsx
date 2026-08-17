import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Text } from "@/components/ui/text";
import type { AthleteHomeData } from "@/data/mock/dashboards";
import { spacing } from "@/theme/tokens";

export function WeeklyProgressCard({
  progress,
}: {
  progress: AthleteHomeData["weeklyProgress"];
}) {
  const percentage = Math.round((progress.completed / progress.assigned) * 100);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text variant="heading">Weekly progress</Text>
          <Text tone="muted">Your assigned training this week</Text>
        </View>
        <Text variant="heading" tone="accent">
          {percentage}%
        </Text>
      </View>
      <ProgressBar
        value={percentage}
        label={`${progress.completed} of ${progress.assigned} workouts completed`}
      />
      <View style={styles.footer}>
        <Text variant="label">
          {progress.completed} of {progress.assigned} workouts
        </Text>
        <Text variant="caption" tone="muted">
          {progress.volumeKg.toLocaleString()} kg volume
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
