import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
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
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
