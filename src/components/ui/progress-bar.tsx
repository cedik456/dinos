import { StyleSheet, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

type ProgressBarProps = {
  value: number;
  label: string;
};

export function ProgressBar({ value, label }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage,
        text: `${percentage}%`,
      }}
      style={styles.track}
    >
      <View style={[styles.fill, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 9,
    width: "100%",
    overflow: "hidden",
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
});
