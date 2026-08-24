import { getAthleteHome, getCoachHome } from "@/data/mock/dashboards";

describe("Phase 1 dashboard fixtures", () => {
  it("provides one complete athlete week without persistence", async () => {
    const dashboard = await getAthleteHome();

    expect(dashboard.week).toHaveLength(7);
    expect(dashboard.weeklyProgress.completed).toBeLessThanOrEqual(
      dashboard.weeklyProgress.assigned,
    );
    expect(dashboard.workout.exerciseCount).toBeGreaterThan(0);
  });

  it("provides a compact coach review queue", async () => {
    const dashboard = await getCoachHome();

    expect(dashboard.activeAthletes).toBeGreaterThanOrEqual(
      dashboard.needsReview.length,
    );
    expect(dashboard.needsReview.map((item) => item.id)).toEqual([
      "review-mika",
      "review-alex",
      "review-sam",
    ]);
  });
});
