import { useAuth, useClerk } from "@clerk/expo";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  RosterApiError,
  rosterApi,
  type MineInvitation,
} from "@/features/roster/roster-api";
import { colors, layout, radii, spacing } from "@/theme/tokens";
import { AuthField } from "./auth-field";
import { AuthShell } from "./auth-shell";
import { DinoApiError, identityApi } from "./identity-api";
import { useIdentity } from "./identity-context";

export function ActivationScreen() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { refresh } = useIdentity();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<MineInvitation>();
  const [displayName, setDisplayName] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);

  const activate = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session");
      try {
        setInvitation(await rosterApi.mine(token));
        return;
      } catch (error) {
        if (
          !(error instanceof RosterApiError) ||
          ![404, 409].includes(error.status)
        ) {
          throw error;
        }
      }
      await identityApi.activate(token);
      await refresh();
    } catch (error) {
      const reference =
        error instanceof DinoApiError ? error.requestId : undefined;
      setMessage(
        `This identity does not match an open Dino invitation.${reference ? ` Support reference: ${reference}` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!invitation) return;
    if (!displayName.trim()) {
      setMessage("Add the name you want your Coach to see.");
      return;
    }
    if (!adultConfirmed) {
      setMessage("Confirm that you are 18 or older for this pilot.");
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session");
      await rosterApi.accept(token, invitation.id, {
        displayName: displayName.trim(),
        adultConfirmed,
      });
      await refresh();
    } catch (error) {
      const reference =
        error instanceof RosterApiError ? error.requestId : undefined;
      setMessage(
        `Dino could not accept this invitation.${reference ? ` Support reference: ${reference}` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Finish activation"
      subtitle="Dino verifies the invited email and protected account reference before opening your assigned experience."
    >
      {invitation ? (
        <View style={styles.stack}>
          <View style={styles.invitationSummary}>
            <Text variant="bodyStrong">
              Join {invitation.coachDisplayName}&apos;s roster
            </Text>
            <Text tone="muted" variant="caption">
              Your role will permanently be Athlete. Your Coach does not create
              or control your credentials.
            </Text>
          </View>
          <AuthField
            label="Your display name"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: adultConfirmed }}
            onPress={() => setAdultConfirmed((value) => !value)}
            style={styles.confirmation}
          >
            <View
              accessibilityElementsHidden
              style={[
                styles.checkbox,
                adultConfirmed && styles.checkboxChecked,
              ]}
            >
              {adultConfirmed ? (
                <Text tone="inverse" variant="label">
                  ✓
                </Text>
              ) : null}
            </View>
            <Text style={styles.confirmationText}>
              I confirm that I am 18 or older.
            </Text>
          </Pressable>
        </View>
      ) : (
        <Text tone="muted">
          Your Coach or Athlete role comes from Dino. It is never selected on
          this device.
        </Text>
      )}
      {message ? (
        <Text accessibilityRole="alert" tone="danger">
          {message}
        </Text>
      ) : null}
      <Button
        label={
          busy
            ? invitation
              ? "Joining roster…"
              : "Verifying…"
            : invitation
              ? "Accept and join roster"
              : "Verify invitation"
        }
        disabled={busy}
        onPress={() => void (invitation ? accept() : activate())}
      />
      <Button
        label="Use another account"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  invitationSummary: {
    gap: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    padding: spacing.lg,
  },
  confirmation: {
    minHeight: layout.minimumTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  confirmationText: { flex: 1 },
});
