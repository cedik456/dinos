import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/tokens";

export function HostedSignInButton() {
  const { startHostedAuth } = useHostedAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string>();

  const openAccountPortal = async () => {
    setError(undefined);
    setIsOpening(true);
    try {
      await startHostedAuth({ mode: "sign-in" });
    } catch {
      setError("Clerk could not open. Check your connection and try again.");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        label={isOpening ? "Opening Clerk…" : "Continue with Clerk"}
        disabled={isOpening}
        onPress={() => void openAccountPortal()}
      />
      {error ? (
        <Text accessibilityRole="alert" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
});
