import { mealRecommendationKeys } from "@/features/meal-recommendations/meal-recommendations-queries";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

const coach: WorkoutActor = {
  accountId: "coach-1",
  role: "Coach",
  getToken: async () => null,
};

const athlete: WorkoutActor = {
  accountId: "athlete-1",
  role: "Athlete",
  getToken: async () => null,
};

describe("meal recommendation query keys", () => {
  it("separates Coach targets, Athlete reads, weeks, and time zones", () => {
    const coachWeek = mealRecommendationKeys.coach(
      coach,
      "athlete-1",
      "2026-08-24",
      "Asia/Manila",
    );

    expect(coachWeek).not.toEqual(
      mealRecommendationKeys.coach(
        coach,
        "athlete-2",
        "2026-08-24",
        "Asia/Manila",
      ),
    );
    expect(coachWeek).not.toEqual(
      mealRecommendationKeys.athlete(athlete, "2026-08-24", "Asia/Manila"),
    );
    expect(coachWeek).not.toEqual(
      mealRecommendationKeys.coach(
        coach,
        "athlete-1",
        "2026-08-31",
        "Asia/Manila",
      ),
    );
  });
});
