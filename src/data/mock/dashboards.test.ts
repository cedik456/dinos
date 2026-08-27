import { getAthleteHome, getCoachHome } from "@/data/mock/dashboards";

describe("Phase 1 dashboard fixtures", () => {
  it("keeps only the deferred athlete dashboard fixtures", async () => {
    const dashboard = await getAthleteHome();

    expect(dashboard.workout.exerciseCount).toBeGreaterThan(0);
    expect(dashboard.nutrition.proteinTarget).toBeGreaterThan(0);
  });

  it("keeps Coach identity copy separate from live weekly data", async () => {
    const dashboard = await getCoachHome();

    expect(dashboard.coach.firstName).toBe("Ced");
    expect(dashboard.context).not.toMatch(/active athletes/i);
  });
});
