import { BlurView } from "expo-blur";
import { Tabs, usePathname } from "expo-router";
import { useEffect } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FloatingAccountButton } from "@/components/shell/floating-account-button";
import { mainTabIndex } from "@/components/shell/main-tab-path";
import { type AppRole, roleTabs } from "@/components/shell/role-tab-config";
import { Icon, type IconName } from "@/components/ui/icon";
import { appAccessMode } from "@/features/preview/development-access";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useReducedTransparency } from "@/hooks/use-reduced-transparency";
import {
  colors,
  layout,
  motion,
  radii,
  shadows,
  spacing,
} from "@/theme/tokens";

const TAB_INDICATOR_EASING = Easing.bezier(0.77, 0, 0.175, 1);

function TabIcon({ focused, icon }: { focused: boolean; icon: IconName }) {
  return (
    <View style={styles.iconContainer}>
      <Icon
        name={icon}
        size={22}
        weight={focused ? "semibold" : "regular"}
        tintColor={focused ? colors.text : colors.textMuted}
      />
    </View>
  );
}

function indicatorPosition(
  selectedIndex: number,
  tabCount: number,
  tabBarWidth: number,
) {
  const contentWidth = tabBarWidth - spacing.sm * 2;
  const slotWidth = contentWidth / tabCount;

  return (
    spacing.sm +
    slotWidth * selectedIndex +
    (slotWidth - layout.floatingTabIndicatorSize) / 2
  );
}

function GlassTabBackground({
  selectedIndex,
  tabCount,
  tabBarWidth,
}: {
  selectedIndex: number;
  tabCount: number;
  tabBarWidth: number;
}) {
  const reducedTransparency = useReducedTransparency();
  const reducedMotion = useReducedMotion();
  const canBlur =
    !reducedTransparency && (Platform.OS === "ios" || Platform.OS === "web");
  const indicatorX = useSharedValue(
    indicatorPosition(selectedIndex, tabCount, tabBarWidth),
  );

  useEffect(() => {
    const nextPosition = indicatorPosition(
      selectedIndex,
      tabCount,
      tabBarWidth,
    );

    indicatorX.set(
      reducedMotion
        ? nextPosition
        : withTiming(nextPosition, {
            duration: motion.tabIndicatorDurationMs,
            easing: TAB_INDICATOR_EASING,
          }),
    );
  }, [indicatorX, reducedMotion, selectedIndex, tabBarWidth, tabCount]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
  }));

  return (
    <View style={styles.backgroundClip}>
      {canBlur ? (
        <BlurView
          intensity={76}
          tint="systemThinMaterialLight"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackSurface]} />
      )}
      <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
    </View>
  );
}

export function RoleTabs({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarWidth = Math.min(
    layout.floatingTabBarMaxWidth,
    width - spacing.xxl * 2,
  );
  const tabBarHorizontalInset = (width - tabBarWidth) / 2;
  const tabs = roleTabs[role];
  const selectedIndex = mainTabIndex(pathname, role);

  return (
    <View style={styles.container}>
      <Tabs
        safeAreaInsets={{ bottom: 0 }}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIconStyle: styles.tabIcon,
          tabBarBackground: () => (
            <GlassTabBackground
              selectedIndex={selectedIndex}
              tabCount={tabs.length}
              tabBarWidth={tabBarWidth}
            />
          ),
          tabBarItemStyle: styles.tabItem,
          tabBarStyle: [
            styles.tabBar,
            {
              start: tabBarHorizontalInset,
              end: tabBarHorizontalInset,
              bottom: Math.max(insets.bottom, spacing.md),
            },
          ],
        }}
      >
        {tabs.map((tab) => (
          <Tabs.Screen
            key={tab.route}
            name={tab.route}
            options={{
              title: tab.label,
              tabBarAccessibilityLabel: tab.label,
              tabBarIcon: ({ focused }) => (
                <TabIcon focused={focused} icon={tab.icon} />
              ),
            }}
          />
        ))}
      </Tabs>
      {appAccessMode === "clerk" ? <FloatingAccountButton role={role} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: "absolute",
    height: layout.floatingTabBarHeight,
    borderTopWidth: 0,
    borderWidth: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.transparent,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    overflow: "visible",
    ...shadows.floating,
  },
  backgroundClip: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    borderRadius: radii.pill,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    backgroundColor: colors.transparent,
  },
  fallbackSurface: {
    backgroundColor: colors.glassFallback,
  },
  tabIndicator: {
    position: "absolute",
    top: (layout.floatingTabBarHeight - layout.floatingTabIndicatorSize) / 2,
    width: layout.floatingTabIndicatorSize,
    height: layout.floatingTabIndicatorSize,
    borderRadius: radii.pill,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabItem: {
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: layout.floatingTabIconSize,
    height: layout.floatingTabIconSize,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    transform: [{ translateY: 4 }],
  },
});
