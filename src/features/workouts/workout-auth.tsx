import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { useIdentity } from "@/features/identity/identity-context";

export type WorkoutRole = "Coach" | "Athlete";

export type WorkoutActor = {
  accountId: string;
  role: WorkoutRole;
  previewRole?: "coach" | "athlete";
  getToken?: () => Promise<string | null>;
};

type WorkoutAuthContextValue =
  | { mode: "preview" }
  | {
      mode: "clerk";
      account: { id: string; role: WorkoutRole } | null;
      getToken: () => Promise<string | null>;
    };

const WorkoutAuthContext = createContext<WorkoutAuthContextValue | null>(null);

export function PreviewWorkoutAuthProvider({ children }: PropsWithChildren) {
  return (
    <WorkoutAuthContext.Provider value={{ mode: "preview" }}>
      {children}
    </WorkoutAuthContext.Provider>
  );
}

export function ClerkWorkoutAuthProvider({ children }: PropsWithChildren) {
  const { getToken } = useAuth();
  const { state } = useIdentity();
  const value = useMemo<WorkoutAuthContextValue>(
    () => ({
      mode: "clerk",
      account:
        state.kind === "active"
          ? { id: state.account.id, role: state.account.role }
          : null,
      getToken,
    }),
    [getToken, state],
  );
  return (
    <WorkoutAuthContext.Provider value={value}>
      {children}
    </WorkoutAuthContext.Provider>
  );
}

const previewIds: Record<WorkoutRole, string> = {
  Coach: "10000000-0000-4000-8000-000000000001",
  Athlete: "10000000-0000-4000-8000-000000000002",
};

export function useWorkoutActor(role: WorkoutRole) {
  const auth = useContext(WorkoutAuthContext);
  const queryClient = useQueryClient();
  if (!auth) {
    throw new Error(
      "useWorkoutActor must be used inside a workout auth provider.",
    );
  }
  const actor = useMemo<WorkoutActor | null>(() => {
    if (auth.mode === "preview") {
      return {
        accountId: previewIds[role],
        role,
        previewRole: role.toLowerCase() as "coach" | "athlete",
      };
    }
    if (!auth.account || auth.account.role !== role) return null;
    return {
      accountId: auth.account.id,
      role,
      getToken: auth.getToken,
    };
  }, [auth, role]);
  const actorKey = actor ? `${actor.accountId}:${actor.role}` : null;
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!actorKey) {
      setReadyKey(null);
      return;
    }
    queryClient.removeQueries({
      predicate: (query) => {
        const [root, accountId, cachedRole] = query.queryKey;
        return (
          root === "workoutAssignments" &&
          (accountId !== actor!.accountId || cachedRole !== actor!.role)
        );
      },
    });
    setReadyKey(actorKey);
  }, [actor, actorKey, queryClient]);

  return { actor, ready: Boolean(actor && readyKey === actorKey) };
}
