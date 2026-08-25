import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useEffect, type PropsWithChildren } from "react";
import { AppState } from "react-native";

import { WorkoutApiError } from "@/features/workouts/workout-api";
import { RosterApiError } from "@/features/roster/roster-api";

export const workoutQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (
          (error instanceof WorkoutApiError ||
            error instanceof RosterApiError) &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000),
    },
    mutations: { retry: false },
  },
});

let listenersReady = false;

function setupReactQueryListeners() {
  if (listenersReady) return;
  listenersReady = true;
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) =>
      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      ),
    ),
  );
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) =>
      setFocused(state === "active"),
    );
    return () => subscription.remove();
  });
}

export function WorkoutQueryProvider({ children }: PropsWithChildren) {
  useEffect(setupReactQueryListeners, []);
  return (
    <QueryClientProvider client={workoutQueryClient}>
      {children}
    </QueryClientProvider>
  );
}
