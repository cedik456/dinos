import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { colors, radii, spacing } from "@/theme/tokens";

type FeaturePlaceholderProps = {
  title: string;
  description: string;
  icon: IconName;
  children?: ReactNode;
};

export function FeaturePlaceholder({
  title,
  description,
  icon,
  children,
}: FeaturePlaceholderProps) {
  return (
    <Screen hasFloatingTabs contentContainerStyle={styles.screen}>
      <Text variant="caption" tone="accent" style={styles.brand}>
        DINO
      </Text>
      <Text accessibilityRole="header" variant="title">
        {title}
      </Text>
      <Card style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon
            name={icon}
            size={26}
            weight="semibold"
            tintColor={colors.accent}
          />
        </View>
        <Text variant="heading">Navigation ready</Text>
        <Text tone="muted" style={styles.centerText}>
          {description}
        </Text>
        <Text variant="caption" tone="muted" style={styles.centerText}>
          This Phase 1 screen validates the app shell only. Its workflow arrives
          in a later approved phase.
        </Text>
      </Card>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.sm,
  },
  brand: {
    letterSpacing: 1.8,
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.xxl,
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    maxWidth: 380,
    textAlign: "center",
  },
});
