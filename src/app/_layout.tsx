import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import {
  IdentityProvider,
  useIdentity,
} from "@/features/identity/identity-context";
import { appAccessMode } from "@/features/preview/development-access";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { colors } from "@/theme/tokens";
import {
  ClerkWorkoutAuthProvider,
  PreviewWorkoutAuthProvider,
} from "@/features/workouts/workout-auth";
import { WorkoutQueryProvider } from "@/features/workouts/workout-query-client";

import "@/global.css";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

function PreviewNavigator() {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <Stack
        screenOptions={{
          animation: reducedMotion ? "none" : "fade",
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="athlete" />
        <Stack.Screen name="coach" />
        <Stack.Protected guard={false}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="activate" />
          <Stack.Screen name="account" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

function RootNavigator() {
  const reducedMotion = useReducedMotion();
  const { isLoaded, isSignedIn } = useAuth();
  const { state } = useIdentity();

  if (!isLoaded) return null;

  return (
    <>
      <Stack
        screenOptions={{
          animation: reducedMotion ? "none" : "fade",
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected
          guard={isSignedIn === true && state.kind === "unlinked"}
        >
          <Stack.Screen name="activate" />
        </Stack.Protected>
        <Stack.Protected guard={state.kind === "active"}>
          <Stack.Screen
            name="account"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [0.42],
              sheetGrabberVisible: true,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack.Protected>
        <Stack.Protected
          guard={state.kind === "active" && state.account.role === "Athlete"}
        >
          <Stack.Screen name="athlete" />
        </Stack.Protected>
        <Stack.Protected
          guard={state.kind === "active" && state.account.role === "Coach"}
        >
          <Stack.Screen name="coach" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  if (appAccessMode === "preview") {
    return (
      <WorkoutQueryProvider>
        <PreviewWorkoutAuthProvider>
          <PreviewNavigator />
        </PreviewWorkoutAuthProvider>
      </WorkoutQueryProvider>
    );
  }

  if (!publishableKey) {
    throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required.");
  }

  return (
    <WorkoutQueryProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <IdentityProvider>
          <ClerkWorkoutAuthProvider>
            <RootNavigator />
          </ClerkWorkoutAuthProvider>
        </IdentityProvider>
      </ClerkProvider>
    </WorkoutQueryProvider>
  );
}
