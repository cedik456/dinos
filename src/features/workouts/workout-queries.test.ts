import type { WorkoutDetail } from "@/features/workouts/workout-api";
import {
  refreshWorkoutQueries,
  workoutKeys,
} from "@/features/workouts/workout-queries";
import { weeklyProgressKeys } from "@/features/weekly-progress/weekly-progress-queries";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

describe("workout query refresh", () => {
  it("refreshes workout and weekly progress after a mutation", async () => {
    const actor = {
      accountId: "athlete-id",
      role: "Athlete" as const,
      getToken: jest.fn(),
    };
    const detail = { id: "workout-id" } as WorkoutDetail;
    const queryClient = {
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(() => Promise.resolve()),
    };

    await refreshWorkoutQueries(queryClient, actor, detail);

    expect(queryClient.setQueryData).toHaveBeenCalledWith(
      workoutKeys.detail(actor, detail.id),
      detail,
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: workoutKeys.root(actor),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: weeklyProgressKeys.root(actor),
    });
  });
});
