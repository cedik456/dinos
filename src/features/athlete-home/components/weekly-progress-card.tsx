import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Text } from "@/components/ui/text";
import type { WeeklySummary } from "@/features/weekly-progress/weekly-progress-api";
import { spacing } from "@/theme/tokens";

export function WeeklyProgressCard({ summary }: { summary: WeeklySummary }) {
  const percentage = summary.progressPercent ?? 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text variant="heading">Weekly progress</Text>
          <Text tone="muted">Your assigned training this week</Text>
        </View>
        <Text variant="heading" tone="accent">
          {summary.progressPercent === null
            ? "No workouts due"
            : `${percentage}%`}
        </Text>
      </View>
      <ProgressBar
        value={percentage}
        label={
          summary.progressPercent === null
            ? "No workouts due this week"
            : `${summary.completedCount} of ${summary.dueCount} due workouts completed`
        }
      />
      <View style={styles.footer}>
        <Text variant="label">
          {summary.completedCount} of {summary.dueCount} due workouts
        </Text>
        <Text variant="caption" tone="muted">
          {summary.awaitingReviewCount} awaiting review ·{" "}
          {summary.reviewedCount} reviewed
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
