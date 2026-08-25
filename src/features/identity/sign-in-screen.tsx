import { useSignIn } from "@clerk/expo";
import { Link, type Href } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthField } from "./auth-field";
import { AuthShell } from "./auth-shell";

type Step = "password" | "verification";

export function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("password");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string>();

  const finalize = async () => {
    await signIn.finalize();
  };

  const submit = async () => {
    setMessage(undefined);
    const { error } = await signIn.password({ emailAddress, password });
    if (error) return;
    if (signIn.status === "complete") {
      await finalize();
      return;
    }

    if (
      signIn.status === "needs_second_factor" ||
      signIn.status === "needs_client_trust"
    ) {
      const supportsEmailCode = signIn.supportedSecondFactors.some(
        (factor) => factor.strategy === "email_code",
      );
      if (!supportsEmailCode) {
        setMessage(
          "This account requires a verification method Dino does not support yet.",
        );
        return;
      }
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (!sendError) setStep("verification");
      return;
    }

    setMessage(
      "This sign in needs another verification step. Contact Dino support.",
    );
  };

  const verify = async () => {
    setMessage(undefined);
    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) return;
    if (signIn.status === "complete") {
      await finalize();
      return;
    }
    setMessage("Verification is not complete yet. Please request a new code.");
  };

  const resend = async () => {
    setMessage(undefined);
    await signIn.mfa.sendEmailCode();
  };

  const returnToPassword = async () => {
    await signIn.reset();
    setStep("password");
    setCode("");
    setMessage(undefined);
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
      {step === "password" ? (
        <>
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
        </>
      ) : (
        <>
          <Text>Enter the verification code Clerk sent to {emailAddress}.</Text>
          <AuthField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            error={errors.fields.code?.message}
          />
        </>
      )}
      {message ? (
        <Text accessibilityRole="alert" tone="danger">
          {message}
        </Text>
      ) : null}
      {step === "password" ? (
        <>
          <Button
            label={fetchStatus === "fetching" ? "Signing in…" : "Sign in"}
            disabled={fetchStatus === "fetching" || !emailAddress || !password}
            onPress={() => void submit()}
          />
          <Link href={"/recovery" as Href} asChild>
            <Button
              label="Forgot password or activation link"
              variant="ghost"
            />
          </Link>
        </>
      ) : (
        <>
          <Button
            label={fetchStatus === "fetching" ? "Verifying…" : "Verify code"}
            disabled={fetchStatus === "fetching" || !code}
            onPress={() => void verify()}
          />
          <Button
            label="Send a new code"
            variant="secondary"
            disabled={fetchStatus === "fetching"}
            onPress={() => void resend()}
          />
          <Button
            label="Use a different account"
            variant="ghost"
            onPress={() => void returnToPassword()}
          />
        </>
      )}
    </AuthShell>
  );
}
