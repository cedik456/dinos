import { Redirect, type Href } from "expo-router";

import { AccessStateScreen } from "@/features/identity/access-state-screen";
import { useIdentity } from "@/features/identity/identity-context";
import { appAccessMode } from "@/features/preview/development-access";
import { PreviewLauncherScreen } from "@/features/preview/preview-launcher-screen";

function IdentityGateRoute() {
  const { state, refresh, clearAccessState } = useIdentity();

  if (state.kind === "loading") {
    return <AccessStateScreen state="loading" onAction={refresh} />;
  }
  if (state.kind === "signed_out")
    return <Redirect href={"/sign-in" as Href} />;
  if (state.kind === "active") {
    return (
      <Redirect href={state.account.role === "Coach" ? "/coach" : "/athlete"} />
    );
  }
  if (state.kind === "unlinked") return <Redirect href={"/activate" as Href} />;
  if (state.kind === "disabled") {
    return (
      <AccessStateScreen
        state="disabled"
        requestId={state.requestId}
        onAction={clearAccessState}
      />
    );
  }
  return (
    <AccessStateScreen
      state="retry"
      requestId={state.requestId}
      onAction={refresh}
    />
  );
}

export default function IndexRoute() {
  if (appAccessMode === "preview") return <PreviewLauncherScreen />;

  return <IdentityGateRoute />;
}
