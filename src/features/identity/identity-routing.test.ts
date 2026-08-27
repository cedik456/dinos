import { accountRoute, identityFailureState } from "./identity-routing";

describe("identity routing", () => {
  it("maps only the server role to a protected route", () => {
    expect(
      accountRoute({
        id: "1",
        displayName: "Coach",
        role: "Coach",
        status: "active",
      }),
    ).toBe("/coach");
    expect(
      accountRoute({
        id: "2",
        displayName: "Athlete",
        role: "Athlete",
        status: "active",
      }),
    ).toBe("/athlete");
  });

  it("keeps disabled and unmatched identities outside protected routes", () => {
    expect(identityFailureState("ACCOUNT_DISABLED")).toBe("disabled");
    expect(identityFailureState("ACCOUNT_UNLINKED")).toBe("unlinked");
    expect(identityFailureState("NETWORK_ERROR")).toBe("retry");
  });
});
