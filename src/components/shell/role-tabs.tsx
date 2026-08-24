import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type AppRole, roleTabs } from "@/components/shell/role-tab-config";
import { Icon, type IconName } from "@/components/ui/icon";
import { useReducedTransparency } from "@/hooks/use-reduced-transparency";
import { colors, layout, radii, shadows, spacing } from "@/theme/tokens";

function TabIcon({ focused, icon }: { focused: boolean; icon: IconName }) {
  return (
    <View
      style={[styles.iconContainer, focused && styles.iconContainerSelected]}
    >
      <Icon
        name={icon}
        size={22}
        weight={focused ? "semibold" : "regular"}
        tintColor={focused ? colors.text : colors.textMuted}
      />
    </View>
  );
}

function GlassTabBackground() {
  const reducedTransparency = useReducedTransparency();
  const canBlur =
    !reducedTransparency && (Platform.OS === "ios" || Platform.OS === "web");

  return (
    <View style={styles.backgroundClip}>
      {canBlur ? (
        <BlurView
          intensity={72}
          tint="systemThinMaterialLight"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackSurface]} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
    </View>
  );
}

export function RoleTabs({ role }: { role: AppRole }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarHorizontalInset = Math.max(
    spacing.xxl,
    (width - layout.floatingTabBarMaxWidth) / 2,
  );
  const tabs = roleTabs[role];

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarBackground: GlassTabBackground,
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
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.glassSurface,
  },
  fallbackSurface: {
    backgroundColor: colors.glassFallback,
  },
  glassTint: {
    pointerEvents: "none",
    backgroundColor: "rgba(245, 247, 241, 0.18)",
  },
  tabItem: {
    minHeight: layout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerSelected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
