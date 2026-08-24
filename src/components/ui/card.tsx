import { StyleSheet, View, type ViewProps } from "react-native";

import { colors, radii, shadows, spacing } from "@/theme/tokens";

type CardProps = ViewProps & {
  tone?: "default" | "muted" | "accent";
};

const toneStyles = StyleSheet.create({
  default: { backgroundColor: colors.surface },
  muted: { backgroundColor: colors.surfaceMuted },
  accent: { backgroundColor: colors.accentSoft },
});

export function Card({ style, tone = "default", ...props }: CardProps) {
  return <View {...props} style={[styles.card, toneStyles[tone], style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
});
