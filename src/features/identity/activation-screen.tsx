import { useAuth, useClerk } from "@clerk/expo";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthShell } from "./auth-shell";
import { DinoApiError, identityApi } from "./identity-api";
import { useIdentity } from "./identity-context";

export function ActivationScreen() {
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { refresh } = useIdentity();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  const activate = async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session");
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

  return (
    <AuthShell
      title="Finish activation"
      subtitle="Dino verifies the invited email and protected account reference before opening your assigned experience."
    >
      <Text tone="muted">
        Your Coach or Athlete role comes from the pending Dino account. It is
        never selected on this device.
      </Text>
      {message ? (
        <Text accessibilityRole="alert" tone="danger">
          {message}
        </Text>
      ) : null}
      <Button
        label={busy ? "Verifying…" : "Verify invitation"}
        disabled={busy}
        onPress={() => void activate()}
      />
      <Button
        label="Use another account"
        variant="secondary"
        onPress={() => void signOut()}
      />
    </AuthShell>
  );
}
