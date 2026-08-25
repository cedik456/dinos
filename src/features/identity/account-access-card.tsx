import { useClerk } from "@clerk/expo";
import { StyleSheet } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { spacing } from "@/theme/tokens";
import { useIdentity } from "./identity-context";

export function AccountAccessCard() {
  const { signOut } = useClerk();
  const { state } = useIdentity();

  if (state.kind !== "active") return null;

  return (
    <Card style={styles.card}>
      <Text variant="heading">Account access</Text>
      <Text tone="muted">
        Signed in as {state.account.displayName}, {state.account.role}. This
        role is fixed by Dino.
      </Text>
      <Button
        label="Sign out"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg, gap: spacing.md },
});
