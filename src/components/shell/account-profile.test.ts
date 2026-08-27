import {
  accountInitials,
  accountPressTiming,
} from "@/components/shell/account-profile";
import { isMainTabPath, mainTabIndex } from "@/components/shell/main-tab-path";

describe("floating account control", () => {
  it("derives compact initials from the Dino display name", () => {
    expect(accountInitials("Cedric Nano")).toBe("CN");
    expect(accountInitials("Cedric")).toBe("C");
    expect(accountInitials("  ")).toBe("D");
  });

  it("uses a timing function supported by native Reanimated CSS", () => {
    expect(accountPressTiming).toBe("ease-out");
  });

  it("appears on main tabs and stays off deeper task screens", () => {
    expect(isMainTabPath("/coach", "coach")).toBe(true);
    expect(isMainTabPath("/coach/reports", "coach")).toBe(true);
    expect(isMainTabPath("/athlete/progress", "athlete")).toBe(true);
    expect(isMainTabPath("/coach/reports/athlete-1", "coach")).toBe(false);
    expect(isMainTabPath("/athlete/plan/workout-1", "athlete")).toBe(false);
  });

  it("keeps the selected tab aligned on main and deeper tab routes", () => {
    expect(mainTabIndex("/athlete", "athlete")).toBe(0);
    expect(mainTabIndex("/athlete/meals", "athlete")).toBe(2);
    expect(mainTabIndex("/athlete/progress", "athlete")).toBe(3);
    expect(mainTabIndex("/athlete/plan/workout-1", "athlete")).toBe(1);
    expect(mainTabIndex("/coach/meals", "coach")).toBe(3);
    expect(mainTabIndex("/coach/reports/athlete-1", "coach")).toBe(4);
  });
});
