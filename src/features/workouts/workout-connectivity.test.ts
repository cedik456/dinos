import { isWorkoutOffline } from "@/features/workouts/workout-connectivity";

describe("workout connectivity", () => {
  it("treats either confirmed connection failure as offline", () => {
    expect(
      isWorkoutOffline({
        isConnected: false,
        isInternetReachable: null,
      }),
    ).toBe(true);
    expect(
      isWorkoutOffline({
        isConnected: true,
        isInternetReachable: false,
      }),
    ).toBe(true);
  });

  it("does not treat an unknown connection as offline", () => {
    expect(
      isWorkoutOffline({
        isConnected: null,
        isInternetReachable: null,
      }),
    ).toBe(false);
  });
});
