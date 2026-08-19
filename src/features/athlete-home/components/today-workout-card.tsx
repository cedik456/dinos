import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { Text } from "@/components/ui/text";
import type { AthleteHomeData } from "@/data/mock/dashboards";
import { colors, radii, spacing } from "@/theme/tokens";

type TodayWorkoutCardProps = {
  workout: AthleteHomeData["workout"];
  onViewPlan: () => void;
};

export function TodayWorkoutCard({
  workout,
  onViewPlan,
}: TodayWorkoutCardProps) {
  return (
    <Card tone="accent" style={styles.card}>
      <View style={styles.topRow}>
        <StatusBadge label={workout.status} tone="success" />
        <View style={styles.iconContainer}>
          <Icon
            name={{
              ios: "dumbbell.fill",
              android: "fitness-center",
              web: "fitness-center",
            }}
            size={24}
            weight="semibold"
            tintColor={colors.accent}
          />
        </View>
      </View>
      <View style={styles.copy}>
        <Text variant="caption" tone="accent">
          TODAY&apos;S WORKOUT
        </Text>
        <Text accessibilityRole="header" variant="title" style={styles.title}>
          {workout.name}
        </Text>
        <Text tone="muted">
          {workout.exerciseCount} exercises · {workout.estimatedMinutes} minutes
        </Text>
      </View>
      <Button label="View plan" trailingArrow onPress={onViewPlan} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xl,
    padding: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 27,
  },
});
