import { StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/ui/text";
import { colors, layout, radii, spacing } from "@/theme/tokens";

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  textContentType?: "emailAddress" | "password" | "newPassword" | "oneTimeCode";
};

export function AuthField({ label, error, ...props }: AuthFieldProps) {
  return (
    <View style={styles.group}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error && styles.inputError]}
      />
      {error ? (
        <Text accessibilityRole="alert" tone="danger" variant="caption">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  input: {
    minHeight: layout.minimumTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
  },
  inputError: { borderColor: colors.danger },
});
