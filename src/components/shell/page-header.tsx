import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { colors, radii, spacing } from "@/theme/tokens";

type PageHeaderProps = {
  greeting: string;
  context: string;
  initials: string;
  profileLabel: string;
};

export function PageHeader({
  greeting,
  context,
  initials,
  profileLabel,
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text variant="caption" tone="accent" style={styles.brand}>
          DINO
        </Text>
        <Text accessibilityRole="header" variant="title">
          {greeting}
        </Text>
        <Text tone="muted">{context}</Text>
      </View>
      <View accessibilityLabel={profileLabel} style={styles.avatar}>
        <Text variant="label" tone="accent">
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  brand: {
    letterSpacing: 1.8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
