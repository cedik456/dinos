import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Screen, ScreenLoading } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/tokens";

export function AccessStateScreen({
  state,
  requestId,
  onAction,
}: {
  state: "loading" | "disabled" | "retry";
  requestId?: string;
  onAction: () => void | Promise<void>;
}) {
  if (state === "loading")
    return <ScreenLoading label="Checking Dino access" />;
  const disabled = state === "disabled";
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View accessibilityRole="alert" style={styles.copy}>
        <Text accessibilityRole="header" variant="title">
          {disabled ? "Access is disabled" : "Dino cannot verify access"}
        </Text>
        <Text tone="muted">
          {disabled
            ? "Your local session has been cleared. Contact Dino support before signing in again."
            : "Protected Coach and Athlete screens stay closed until Dino can verify your account."}
        </Text>
        {requestId ? (
          <Text variant="caption">Support reference: {requestId}</Text>
        ) : null}
      </View>
      <Button
        label={disabled ? "Return to sign in" : "Try again"}
        onPress={() => void onAction()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "center", gap: spacing.xxl },
  copy: { gap: spacing.md },
});
