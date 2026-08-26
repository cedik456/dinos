import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  accountInitials,
  accountPressTiming,
} from "@/components/shell/account-profile";
import { isMainTabPath } from "@/components/shell/main-tab-path";
import type { AppRole } from "@/components/shell/role-tab-config";
import { Text } from "@/components/ui/text";
import { useIdentity } from "@/features/identity/identity-context";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useReducedTransparency } from "@/hooks/use-reduced-transparency";
import { colors, layout, radii, shadows, spacing } from "@/theme/tokens";

export function FloatingAccountButton({ role }: { role: AppRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const reducedTransparency = useReducedTransparency();
  const { state } = useIdentity();
  const [pressed, setPressed] = useState(false);

  if (state.kind !== "active" || !isMainTabPath(pathname, role)) return null;

  const right = Math.max(
    spacing.xl,
    (width - layout.contentMaxWidth) / 2 + spacing.xl,
  );
  const canBlur =
    !reducedTransparency && (Platform.OS === "ios" || Platform.OS === "web");
  const label = `Open ${state.account.displayName} account menu`;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.position, { top: insets.top + spacing.md, right }]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        pressRetentionOffset={spacing.lg}
        onPress={() => router.push("/account")}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <Animated.View
          style={[
            styles.button,
            pressed && (reducedMotion ? styles.pressedReduced : styles.pressed),
          ]}
        >
          {canBlur ? (
            <BlurView
              intensity={76}
              tint="systemThinMaterialLight"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallback]} />
          )}
          <Text variant="label" tone="accent">
            {accountInitials(state.account.displayName)}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: "absolute",
    zIndex: 20,
  },
  button: {
    width: layout.minimumTouchTarget,
    height: layout.minimumTouchTarget,
    overflow: "hidden",
    borderRadius: radii.pill,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: 1 }],
    transitionProperty: "transform",
    transitionDuration: "120ms",
    transitionTimingFunction: accountPressTiming,
    ...shadows.floating,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  pressedReduced: {
    opacity: 0.78,
  },
  fallback: {
    backgroundColor: colors.glassFallback,
  },
});
