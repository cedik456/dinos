import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { colors, radii, spacing } from "@/theme/tokens";

type StatusTone = "success" | "warning" | "danger" | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneStyles: Record<
  StatusTone,
  { backgroundColor: string; color: string }
> = {
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View
      style={[styles.badge, { backgroundColor: toneStyle.backgroundColor }]}
    >
      <View style={[styles.dot, { backgroundColor: toneStyle.color }]} />
      <Text variant="caption" style={{ color: toneStyle.color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
