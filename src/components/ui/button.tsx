import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { SymbolView } from "expo-symbols";

import { Text } from "@/components/ui/text";
import { colors, layout, radii, spacing } from "@/theme/tokens";

type ButtonProps = Omit<PressableProps, "children"> & {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  trailingArrow?: boolean;
};

export function Button({
  label,
  variant = "primary",
  trailingArrow = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const inverse = variant === "primary";

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text variant="label" tone={inverse ? "inverse" : "default"}>
        {label}
      </Text>
      {trailingArrow ? (
        <View style={styles.icon}>
          <SymbolView
            name={{
              ios: "arrow.right",
              android: "arrow_forward",
              web: "arrow_forward",
            }}
            size={17}
            weight="semibold"
            tintColor={inverse ? colors.white : colors.text}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minimumTouchTarget,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  icon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
