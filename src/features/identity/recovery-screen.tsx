import { useSignIn } from "@clerk/expo";
import { Link, type Href } from "expo-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthField } from "./auth-field";
import { AuthShell } from "./auth-shell";
import { identityApi } from "./identity-api";

type Step = "request" | "code" | "password" | "done";

export function RecoveryScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [step, setStep] = useState<Step>("request");
  const [emailAddress, setEmailAddress] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const requestReset = async () => {
    const identified = await signIn.create({ identifier: emailAddress });
    if (!identified.error) {
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (!sent.error) {
        setStep("code");
        return;
      }
    }
    await identityApi.resendActivation(emailAddress).catch(() => undefined);
    setStep("done");
  };

  const verify = async () => {
    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (!error && signIn.status === "needs_new_password") setStep("password");
  };

  const reset = async () => {
    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (!error) setStep("done");
  };

  return (
    <AuthShell
      title="Recover access"
      subtitle="Use your invited email. Dino gives the same public response whether or not an account exists."
    >
      {step === "request" ? (
        <>
          <AuthField
            label="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            textContentType="emailAddress"
            error={errors.fields.identifier?.message}
          />
          <Button
            label={fetchStatus === "fetching" ? "Checking…" : "Continue"}
            disabled={!emailAddress || fetchStatus === "fetching"}
            onPress={() => void requestReset()}
          />
        </>
      ) : null}
      {step === "code" ? (
        <>
          <AuthField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            error={errors.fields.code?.message}
          />
          <Button
            label="Verify code"
            disabled={!code}
            onPress={() => void verify()}
          />
        </>
      ) : null}
      {step === "password" ? (
        <>
          <AuthField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            error={errors.fields.password?.message}
          />
          <Button
            label="Reset password"
            disabled={!password}
            onPress={() => void reset()}
          />
        </>
      ) : null}
      {step === "done" ? (
        <Text accessibilityRole="alert">
          If the email can recover access, instructions have been sent or the
          password was reset.
        </Text>
      ) : null}
      <Link href={"/sign-in" as Href} asChild>
        <Button label="Return to sign in" variant="ghost" />
      </Link>
    </AuthShell>
  );
}
