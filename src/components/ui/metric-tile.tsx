import { StyleSheet, View, type ViewStyle } from "react-native";

import { Text } from "@/components/ui/text";
import { colors, radii, spacing } from "@/theme/tokens";

type MetricTileProps = {
  label: string;
  value: string;
  detail?: string;
  style?: ViewStyle;
  tone?: "default" | "accent" | "warning";
};

const backgrounds = {
  default: colors.surface,
  accent: colors.accentSoft,
  warning: colors.warningSoft,
};

export function MetricTile({
  label,
  value,
  detail,
  style,
  tone = "default",
}: MetricTileProps) {
  return (
    <View
      style={[styles.container, { backgroundColor: backgrounds[tone] }, style]}
    >
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="heading" style={styles.value}>
        {value}
      </Text>
      {detail ? (
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    borderRadius: radii.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  value: {
    fontSize: 19,
    lineHeight: 24,
  },
});
