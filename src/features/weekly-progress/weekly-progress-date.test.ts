import {
  addDays,
  mondayFor,
} from "@/features/weekly-progress/weekly-progress-date";

describe("weekly progress dates", () => {
  it("finds Monday and shifts whole calendar weeks", () => {
    expect(mondayFor("2026-08-26")).toBe("2026-08-24");
    expect(addDays("2026-08-24", 7)).toBe("2026-08-31");
  });
});
