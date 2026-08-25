import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors, layout, spacing } from "@/theme/tokens";

type ScreenProps = ScrollViewProps & {
  hasFloatingTabs?: boolean;
};

export function Screen({
  children,
  contentContainerStyle,
  hasFloatingTabs = false,
  ...props
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  return (
    <View style={[styles.background, { minHeight: height }]}>
      <ScrollView
        {...props}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom:
              insets.bottom + (hasFloatingTabs ? 112 : spacing.xxl),
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function ScreenLoading({ label }: { label: string }) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.stateContainer}
    >
      <ActivityIndicator color={colors.accent} size="small" />
      <Text tone="muted">{label}</Text>
    </View>
  );
}

export function ScreenError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={styles.stateContainer}>
      <Text variant="bodyStrong">Preview unavailable</Text>
      <Text tone="muted" style={styles.centerText}>
        {message}
      </Text>
      <Button label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    minHeight: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
  },
  stateContainer: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  centerText: {
    textAlign: "center",
  },
});
