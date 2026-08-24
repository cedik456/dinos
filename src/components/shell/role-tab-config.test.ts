import { roleTabs } from "@/components/shell/role-tab-config";

describe("role tab configuration", () => {
  it("gives athletes the four approved destinations", () => {
    expect(roleTabs.athlete.map((tab) => tab.label)).toEqual([
      "Home",
      "Plan",
      "Progress",
      "Profile",
    ]);
  });

  it("gives coaches the four approved destinations", () => {
    expect(roleTabs.coach.map((tab) => tab.label)).toEqual([
      "Home",
      "Athletes",
      "Programs",
      "Reports",
    ]);
  });

  it("does not expose a role-switching destination", () => {
    const labels = [...roleTabs.athlete, ...roleTabs.coach].map((tab) =>
      tab.label.toLowerCase(),
    );

    expect(labels).not.toContain("switch role");
    expect(labels).not.toContain("coach");
    expect(labels).not.toContain("athlete");
  });
});
