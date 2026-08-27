import { Platform } from "react-native";

export const colors = {
  background: "#F5F6F1",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF0E9",
  text: "#171A16",
  textMuted: "#687066",
  border: "#DDE2D8",
  accent: "#2F6D49",
  accentPressed: "#25593B",
  accentSoft: "#DDF0DE",
  accentText: "#19432B",
  success: "#2F7A4D",
  successSoft: "#E1F2E5",
  warning: "#996018",
  warningSoft: "#FFF0D2",
  danger: "#A84040",
  dangerSoft: "#F9E3E1",
  glassFallback: "rgba(250, 251, 247, 0.96)",
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const layout = {
  contentMaxWidth: 680,
  floatingTabBarHeight: 64,
  floatingTabBarMaxWidth: 320,
  floatingTabIconSize: 44,
  floatingTabIndicatorSize: 54,
  minimumTouchTarget: 48,
} as const;

export const motion = {
  tabIndicatorDurationMs: 180,
} as const;

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#1B241C",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    android: { elevation: 2 },
    default: {
      boxShadow: "0 6px 20px rgba(27, 36, 28, 0.06)",
    },
  }),
  floating: Platform.select({
    ios: {
      shadowColor: "#172119",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: "0 8px 24px rgba(23, 33, 25, 0.1)",
    },
  }),
} as const;
