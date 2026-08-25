import { useAuth, useClerk } from "@clerk/expo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { DinoApiError, identityApi, type DinoAccount } from "./identity-api";
import { identityFailureState } from "./identity-routing";

type IdentityState =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "active"; account: DinoAccount }
  | { kind: "disabled"; requestId?: string }
  | { kind: "unlinked"; requestId?: string }
  | { kind: "retry"; requestId?: string };

type IdentityContextValue = {
  state: IdentityState;
  refresh: () => Promise<void>;
  clearAccessState: () => void;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();
  const [state, setState] = useState<IdentityState>({ kind: "loading" });

  const refresh = useCallback(async () => {
    if (!isLoaded) return setState({ kind: "loading" });
    if (!isSignedIn) return setState({ kind: "signed_out" });
    setState({ kind: "loading" });
    try {
      const token = await getToken();
      if (!token)
        throw new DinoApiError(
          "Authentication is required.",
          401,
          "AUTH_REQUIRED",
        );
      setState({ kind: "active", account: await identityApi.me(token) });
    } catch (error) {
      const apiError =
        error instanceof DinoApiError
          ? error
          : new DinoApiError("Identity is unavailable.", 0, "NETWORK_ERROR");
      const kind = identityFailureState(apiError.code);
      if (kind === "disabled") await signOut();
      setState({ kind, requestId: apiError.requestId });
    }
  }, [getToken, isLoaded, isSignedIn, signOut]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      state,
      refresh,
      clearAccessState: () => setState({ kind: "signed_out" }),
    }),
    [refresh, state],
  );

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const value = useContext(IdentityContext);
  if (!value)
    throw new Error("useIdentity must be used inside IdentityProvider.");
  return value;
}
