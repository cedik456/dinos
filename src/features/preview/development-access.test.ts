import { resolveAppAccessMode } from "@/features/preview/development-access";

describe("resolveAppAccessMode", () => {
  it("uses the persona preview by default in development", () => {
    expect(
      resolveAppAccessMode({
        isDevelopment: true,
      }),
    ).toBe("preview");
  });

  it("allows Clerk to be tested explicitly in development", () => {
    expect(
      resolveAppAccessMode({
        configuredMode: "clerk",
        isDevelopment: true,
      }),
    ).toBe("clerk");
  });

  it("always uses Clerk outside development", () => {
    expect(
      resolveAppAccessMode({
        configuredMode: "preview",
        isDevelopment: false,
      }),
    ).toBe("clerk");
  });
});
