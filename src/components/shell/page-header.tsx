import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/tokens";

type PageHeaderProps = {
  greeting: string;
  context: string;
};

export function PageHeader({ greeting, context }: PageHeaderProps) {
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
});
