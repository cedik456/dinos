import { Text } from "@/components/ui/text";
import { AuthShell } from "./auth-shell";
import { HostedSignInButton } from "./hosted-sign-in-button";

export function SignInScreen() {
  return (
    <AuthShell
      title="Your coaching space"
      subtitle="Continue to Clerk with the verified email used for your private Dino invitation. Your role is assigned by Dino and cannot be switched here."
      footer={
        <Text variant="caption" tone="muted">
          Private pilot access only. No public registration.
        </Text>
      }
    >
      <Text tone="muted">
        Clerk securely handles sign in, verification, and password recovery.
      </Text>
      <HostedSignInButton />
    </AuthShell>
  );
}
