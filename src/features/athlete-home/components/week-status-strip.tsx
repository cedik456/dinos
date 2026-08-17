import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import type { WeekDay } from "@/data/mock/dashboards";
import { colors, radii, spacing } from "@/theme/tokens";

const statusCopy: Record<
  WeekDay["state"],
  { accessible: string; visible: string }
> = {
  complete: { accessible: "workout complete", visible: "Done" },
  today: { accessible: "today", visible: "Today" },
  upcoming: { accessible: "upcoming", visible: "Next" },
  rest: { accessible: "rest day", visible: "Rest" },
};

export function WeekStatusStrip({ days }: { days: WeekDay[] }) {
  const scrollView = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollView}
      horizontal
      accessibilityLabel="Workout status for August 10 to 16"
      contentContainerStyle={styles.days}
      onContentSizeChange={() =>
        scrollView.current?.scrollToEnd({ animated: false })
      }
      showsHorizontalScrollIndicator={false}
    >
      {days.map((item) => {
        const today = item.state === "today";
        const complete = item.state === "complete";
        const status = statusCopy[item.state];

        return (
          <View
            key={`${item.day}-${item.date}`}
            accessible
            accessibilityLabel={`${item.day}, August ${item.date}, ${status.accessible}`}
            accessibilityRole="text"
            style={[
              styles.day,
              today && styles.dayToday,
              complete && styles.dayComplete,
            ]}
          >
            <Text variant="caption" tone={today ? "inverse" : "muted"}>
              {item.day}
            </Text>
            <Text variant="bodyStrong" tone={today ? "inverse" : "default"}>
              {item.date}
            </Text>
            <Text
              variant="caption"
              tone={today ? "inverse" : complete ? "accent" : "muted"}
              style={styles.stateLabel}
            >
              {status.visible}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  days: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  day: {
    width: 54,
    minHeight: 76,
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  dayComplete: {
    backgroundColor: colors.accentSoft,
  },
  dayToday: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  stateLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
});
