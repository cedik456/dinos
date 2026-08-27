import { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import type {
  WeeklyAthleteDetail,
  WeeklyDayState,
} from "@/features/weekly-progress/weekly-progress-api";
import {
  formatDay,
  formatShortDate,
} from "@/features/weekly-progress/weekly-progress-date";
import { colors, radii, spacing } from "@/theme/tokens";

const statusCopy: Record<
  WeeklyDayState,
  { accessible: string; visible: string }
> = {
  reviewed: { accessible: "reviewed", visible: "Reviewed" },
  awaiting_review: {
    accessible: "complete and awaiting review",
    visible: "Awaiting",
  },
  missed: { accessible: "workout missed", visible: "Missed" },
  today: { accessible: "today", visible: "Today" },
  scheduled: { accessible: "scheduled", visible: "Next" },
  rest: { accessible: "rest day", visible: "Rest" },
};

export function WeekStatusStrip({
  days,
}: {
  days: WeeklyAthleteDetail["days"];
}) {
  const scrollView = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollView}
      horizontal
      accessibilityLabel={`Workout status for ${formatShortDate(days[0]?.date ?? "")} to ${formatShortDate(days.at(-1)?.date ?? "")}`}
      contentContainerStyle={styles.days}
      onContentSizeChange={() =>
        scrollView.current?.scrollToEnd({ animated: false })
      }
      showsHorizontalScrollIndicator={false}
    >
      {days.map((item) => {
        const today = item.state === "today";
        const complete =
          item.state === "reviewed" || item.state === "awaiting_review";
        const missed = item.state === "missed";
        const status = statusCopy[item.state];

        return (
          <View
            key={item.date}
            accessible
            accessibilityLabel={`${formatDay(item.date)}, ${formatShortDate(item.date)}, ${status.accessible}`}
            accessibilityRole="text"
            style={[
              styles.day,
              today && styles.dayToday,
              complete && styles.dayComplete,
              missed && styles.dayMissed,
            ]}
          >
            <Text variant="caption" tone={today ? "inverse" : "muted"}>
              {formatDay(item.date)}
            </Text>
            <Text variant="bodyStrong" tone={today ? "inverse" : "default"}>
              {item.date.slice(-2)}
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
  dayMissed: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  stateLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
});
