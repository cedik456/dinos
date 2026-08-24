import {
  Platform,
  StyleSheet,
  Text as NativeText,
  type TextProps as NativeTextProps,
} from "react-native";

import { colors } from "@/theme/tokens";

type TextVariant =
  "display" | "title" | "heading" | "body" | "bodyStrong" | "label" | "caption";

type TextTone =
  "default" | "muted" | "accent" | "inverse" | "warning" | "danger";

type TextProps = NativeTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

const toneColors: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  accent: colors.accentText,
  inverse: colors.white,
  warning: colors.warning,
  danger: colors.danger,
};

export function Text({
  style,
  variant = "body",
  tone = "default",
  ...props
}: TextProps) {
  return (
    <NativeText
      {...props}
      style={[styles.base, styles[variant], { color: toneColors[tone] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "system-ui",
    }),
  },
  display: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "400",
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
});
