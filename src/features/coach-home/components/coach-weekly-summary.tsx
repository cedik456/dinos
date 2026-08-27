import { StyleSheet, View } from "react-native";

import { MetricTile } from "@/components/ui/metric-tile";
import { Text } from "@/components/ui/text";
import type { WeeklyCoachOverview } from "@/features/weekly-progress/weekly-progress-api";
import { spacing } from "@/theme/tokens";

export function CoachWeeklySummary({
  summary,
}: {
  summary: WeeklyCoachOverview["summary"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text variant="heading">This week</Text>
        <Text variant="caption" tone="muted">
          Across your roster
        </Text>
      </View>
      <View style={styles.metrics}>
        <MetricTile
          label="Adherence"
          value={
            summary.progressPercent === null
              ? "No workouts due"
              : `${summary.progressPercent}%`
          }
          detail={`${summary.completedCount} of ${summary.dueCount} due`}
          tone="accent"
          style={styles.metric}
        />
        <MetricTile
          label="Review"
          value={String(summary.awaitingReviewCount)}
          detail="Awaiting"
          style={styles.metric}
        />
        <MetricTile
          label="Missed"
          value={String(summary.missedCount)}
          detail="Need follow-up"
          tone="warning"
          style={styles.metric}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 104,
  },
});
