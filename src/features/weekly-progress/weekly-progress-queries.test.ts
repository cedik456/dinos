import { weeklyProgressKeys } from "@/features/weekly-progress/weekly-progress-queries";
import type { WorkoutActor } from "@/features/workouts/workout-auth";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

const coach: WorkoutActor = {
  accountId: "coach-1",
  role: "Coach",
  getToken: async () => null,
};

describe("weekly progress query keys", () => {
  it("keeps the normal Coach response separate from paginated reports", () => {
    const weekStart = "2026-08-24";
    const timeZone = "Asia/Manila";

    expect(weeklyProgressKeys.actor(coach, weekStart, timeZone)).not.toEqual(
      weeklyProgressKeys.coachOverview(coach, weekStart, timeZone),
    );
  });
});
