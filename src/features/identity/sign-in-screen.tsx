import { useSignIn } from "@clerk/expo";
import { Link, type Href, useRouter } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthField } from "./auth-field";
import { AuthShell } from "./auth-shell";

export function SignInScreen() {
  const router = useRouter();
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();

  const submit = async () => {
    setMessage(undefined);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;
    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => router.replace(decorateUrl("/") as Href),
      });
      return;
    }
    setMessage(
      "This sign in needs another verification step. Contact Dino support.",
    );
  };

  return (
    <AuthShell
      title="Your coaching space"
      subtitle="Sign in with the verified email used for your private Dino invitation. Your role is assigned by Dino and cannot be switched here."
      footer={
        <Text variant="caption" tone="muted">
          Private pilot access only. No public registration.
        </Text>
      }
    >
      <AuthField
        label="Email"
        value={emailAddress}
        onChangeText={setEmailAddress}
        keyboardType="email-address"
        textContentType="emailAddress"
        error={errors.fields.identifier?.message}
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="password"
        error={errors.fields.password?.message}
      />
      {message ? (
        <Text accessibilityRole="alert" tone="danger">
          {message}
        </Text>
      ) : null}
      <Button
        label={fetchStatus === "fetching" ? "Signing in…" : "Sign in"}
        disabled={fetchStatus === "fetching" || !emailAddress || !password}
        onPress={() => void submit()}
      />
      <Link href={"/recovery" as Href} asChild>
        <Button label="Forgot password or activation link" variant="ghost" />
      </Link>
    </AuthShell>
  );
}
