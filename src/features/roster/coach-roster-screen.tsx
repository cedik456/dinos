import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen, ScreenLoading } from "@/components/ui/screen";
import { StatusBadge } from "@/components/ui/status-badge";
import { Text } from "@/components/ui/text";
import { AuthField } from "@/features/identity/auth-field";
import {
  RosterApiError,
  type RosterInvitation,
} from "@/features/roster/roster-api";
import {
  useCreateRosterInvitation,
  useResendRosterInvitation,
  useRevokeRosterInvitation,
  useRosterAthletes,
  useRosterInvitations,
} from "@/features/roster/roster-queries";
import { useWorkoutActor } from "@/features/workouts/workout-auth";
import { useWorkoutOffline } from "@/features/workouts/workout-connectivity";
import { colors, spacing } from "@/theme/tokens";

function invitationStatus(invitation: RosterInvitation) {
  if (invitation.status === "failed") {
    return { label: "Not sent", tone: "danger" as const };
  }
  if (invitation.status === "sending") {
    return { label: "Sending", tone: "warning" as const };
  }
  return { label: "Pending", tone: "warning" as const };
}

function formatExpiry(value: string | null) {
  if (!value) return "No confirmed expiry";
  return `Expires ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))}`;
}

export function CoachRosterScreen() {
  const { actor, ready } = useWorkoutActor("Coach");
  const offline = useWorkoutOffline();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const invitations = useRosterInvitations(actor, ready);
  const athletes = useRosterAthletes(actor, ready);
  const create = useCreateRosterInvitation(actor!);
  const resend = useResendRosterInvitation(actor!);
  const revoke = useRevokeRosterInvitation(actor!);

  const pendingRows = useMemo(
    () => invitations.data?.pages.flatMap((page) => page.items) ?? [],
    [invitations.data],
  );
  const activeRows = useMemo(
    () => athletes.data?.pages.flatMap((page) => page.items) ?? [],
    [athletes.data],
  );
  const hasData = pendingRows.length > 0 || activeRows.length > 0;
  const firstLoad = invitations.isPending || athletes.isPending;
  const unavailable = offline || invitations.isError || athletes.isError;
  const mutationError = create.error ?? resend.error ?? revoke.error;

  if (!actor || !ready) {
    return (
      <Screen hasFloatingTabs>
        <ScreenLoading label="Preparing your private roster" />
      </Screen>
    );
  }

  if (actor.previewRole) {
    return (
      <Screen hasFloatingTabs contentContainerStyle={styles.screen}>
        <PageHeader
          greeting="Your athletes"
          context="Private roster access starts after hosted Coach sign in."
        />
        <Card style={styles.card}>
          <Text variant="heading">Hosted account required</Text>
          <Text tone="muted">
            The local preview keeps the fixed Athlete for the guarded workout
            loop. Sign in with an authorized Coach account to send real
            invitations.
          </Text>
        </Card>
      </Screen>
    );
  }

  const submit = () => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(undefined);
    create.mutate(normalized, {
      onSuccess: () => setEmail(""),
    });
  };

  return (
    <Screen hasFloatingTabs contentContainerStyle={styles.screen}>
      <PageHeader
        greeting="Your athletes"
        context="Invite adults, then assign workouts only after they accept."
      />

      <Card tone="accent" style={styles.card}>
        <View style={styles.sectionCopy}>
          <Text variant="heading">Invite an Athlete</Text>
          <Text tone="muted">
            They create their own Dino credentials with this exact email.
          </Text>
        </View>
        <AuthField
          label="Athlete email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (emailError) setEmailError(undefined);
          }}
          keyboardType="email-address"
          textContentType="emailAddress"
          error={emailError}
        />
        <Button
          label={create.isPending ? "Sending invitation…" : "Send invitation"}
          disabled={create.isPending || offline}
          onPress={submit}
        />
        {offline ? (
          <Text accessibilityRole="alert" tone="warning" variant="caption">
            You are offline. Dino keeps this email here and does not queue the
            invitation.
          </Text>
        ) : null}
      </Card>

      {mutationError ? (
        <Card style={styles.errorCard}>
          <Text accessibilityRole="alert" tone="danger" variant="bodyStrong">
            {mutationError instanceof RosterApiError
              ? mutationError.message
              : "The roster change did not finish."}
          </Text>
          <Text tone="muted" variant="caption">
            Nothing is queued. You may try the action again.
          </Text>
        </Card>
      ) : null}

      {firstLoad && !hasData && !unavailable ? (
        <ScreenLoading label="Loading your private roster" />
      ) : null}

      {unavailable ? (
        <Card style={styles.card}>
          <Text variant="heading">
            {hasData ? "Showing the last saved roster" : "Roster unavailable"}
          </Text>
          <Text tone="muted">
            Dino could not refresh this roster. Changes are not queued.
          </Text>
          <Button
            label="Retry"
            variant="secondary"
            onPress={() => {
              void invitations.refetch();
              void athletes.refetch();
            }}
          />
        </Card>
      ) : null}

      {!firstLoad && !unavailable && !hasData ? (
        <Card style={styles.card}>
          <Text variant="heading">No athletes yet</Text>
          <Text tone="muted">
            Send the first invitation above. Pending invitations and accepted
            Athletes will stay separate here.
          </Text>
        </Card>
      ) : null}

      {pendingRows.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="heading">Pending</Text>
            <Text tone="accent" variant="label">
              {pendingRows.length}
            </Text>
          </View>
          {pendingRows.map((invitation) => {
            const status = invitationStatus(invitation);
            const busy =
              (resend.isPending && resend.variables === invitation.id) ||
              (revoke.isPending && revoke.variables === invitation.id);
            return (
              <Card key={invitation.id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <View style={styles.rowCopy}>
                    <Text selectable variant="bodyStrong">
                      {invitation.email}
                    </Text>
                    <Text tone="muted" variant="caption">
                      {formatExpiry(invitation.expiresAt)}
                    </Text>
                  </View>
                  <StatusBadge label={status.label} tone={status.tone} />
                </View>
                <View style={styles.actions}>
                  <View style={styles.action}>
                    <Button
                      label={
                        invitation.status === "failed" ? "Try again" : "Resend"
                      }
                      variant="secondary"
                      disabled={busy || offline}
                      onPress={() => resend.mutate(invitation.id)}
                    />
                  </View>
                  <View style={styles.action}>
                    <Button
                      label="Revoke"
                      variant="ghost"
                      disabled={busy || offline}
                      onPress={() => revoke.mutate(invitation.id)}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
          {invitations.hasNextPage ? (
            <Button
              label={invitations.isFetchingNextPage ? "Loading…" : "Load more"}
              variant="secondary"
              disabled={invitations.isFetchingNextPage}
              onPress={() => void invitations.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : null}

      {activeRows.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="heading">Active</Text>
            <Text tone="accent" variant="label">
              {activeRows.length}
            </Text>
          </View>
          {activeRows.map((athlete) => (
            <Card key={athlete.relationshipId} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={styles.rowCopy}>
                  <Text selectable variant="bodyStrong">
                    {athlete.displayName}
                  </Text>
                  <Text tone="muted" variant="caption">
                    Ready for workout assignment
                  </Text>
                </View>
                <StatusBadge label="Active" tone="success" />
              </View>
            </Card>
          ))}
          {athletes.hasNextPage ? (
            <Button
              label={athletes.isFetchingNextPage ? "Loading…" : "Load more"}
              variant="secondary"
              disabled={athletes.isFetchingNextPage}
              onPress={() => void athletes.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xxl },
  card: { gap: spacing.lg },
  section: { gap: spacing.md },
  sectionCopy: { gap: spacing.xs },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowCard: { gap: spacing.md },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm },
  action: { flex: 1 },
  errorCard: {
    gap: spacing.sm,
    borderColor: colors.danger,
  },
});
