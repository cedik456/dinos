import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { accountInitials } from "@/components/shell/account-profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useIdentity } from "@/features/identity/identity-context";
import { colors, radii, spacing } from "@/theme/tokens";

export function AccountSheetScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { state } = useIdentity();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.kind !== "active") return null;

  const email = user?.primaryEmailAddress?.emailAddress;

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch {
      setError("Dino could not log you out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.identityRow}>
        <View style={styles.avatar}>
          <Text variant="heading" tone="accent">
            {accountInitials(state.account.displayName)}
          </Text>
        </View>
        <View style={styles.identityCopy}>
          <Text variant="caption" tone="accent" style={styles.brand}>
            DINO ACCOUNT
          </Text>
          <Text accessibilityRole="header" variant="heading">
            {state.account.displayName}
          </Text>
          <Text selectable tone="muted">
            {email ?? "Verified Clerk account"}
          </Text>
        </View>
      </View>

      <Card style={styles.roleCard}>
        <View style={styles.roleCopy}>
          <Text variant="caption" tone="muted">
            PERMANENT ROLE
          </Text>
          <Text variant="bodyStrong">{state.account.role}</Text>
        </View>
        <Text tone="muted" style={styles.roleNote}>
          Dino assigns one role to this account. It cannot be switched here.
        </Text>
      </Card>

      {error ? (
        <Text accessibilityRole="alert" tone="danger">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={signingOut ? "Logging out…" : "Log out"}
          disabled={signingOut}
          onPress={() => void handleSignOut()}
        />
        <Button
          label="Close"
          variant="ghost"
          disabled={signingOut}
          onPress={() => router.back()}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  brand: {
    letterSpacing: 1.6,
  },
  roleCard: {
    gap: spacing.md,
  },
  roleCopy: {
    gap: spacing.xs,
  },
  roleNote: {
    maxWidth: 360,
  },
  actions: {
    gap: spacing.sm,
  },
});
