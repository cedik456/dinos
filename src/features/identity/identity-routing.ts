import type { DinoAccount } from "./identity-api";

export function accountRoute(account: DinoAccount): "/coach" | "/athlete" {
  return account.role === "Coach" ? "/coach" : "/athlete";
}

export function identityFailureState(code: string) {
  if (code === "ACCOUNT_DISABLED") return "disabled" as const;
  if (code === "ACCOUNT_UNLINKED") return "unlinked" as const;
  return "retry" as const;
}
