import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/card";
import { DinoLogo } from "@/components/ui/dino-logo";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/tokens";

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.brandBlock}>
        <DinoLogo size="welcome" />
        <Text variant="caption" tone="accent" style={styles.wordmark}>
          DINO
        </Text>
        <Text accessibilityRole="header" variant="display">
          {title}
        </Text>
        <Text tone="muted" style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      <Card style={styles.card}>{children}</Card>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", gap: spacing.xxl },
  brandBlock: { alignItems: "center", gap: spacing.sm },
  wordmark: { letterSpacing: 2.2 },
  subtitle: { textAlign: "center", maxWidth: 480 },
  card: { gap: spacing.lg },
  footer: { alignItems: "center", gap: spacing.sm },
});
