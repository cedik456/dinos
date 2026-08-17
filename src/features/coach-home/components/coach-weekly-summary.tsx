import { StyleSheet, View } from "react-native";

import { MetricTile } from "@/components/ui/metric-tile";
import { Text } from "@/components/ui/text";
import type { CoachHomeData } from "@/data/mock/dashboards";
import { spacing } from "@/theme/tokens";

export function CoachWeeklySummary({
  metrics,
}: {
  metrics: CoachHomeData["weeklyMetrics"];
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
          value={`${metrics.adherencePercent}%`}
          detail="Workouts"
          tone="accent"
          style={styles.metric}
        />
        <MetricTile
          label="Check-ins"
          value={String(metrics.checkInsSubmitted)}
          detail="Submitted"
          style={styles.metric}
        />
        <MetricTile
          label="Overdue"
          value={String(metrics.overdueItems)}
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
