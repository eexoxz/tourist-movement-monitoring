import { describe, expect, it } from "vitest";
import { canAccessView, coerceViewForRole, getAllowedViewsForRole, getDefaultViewForRole } from "./access";

describe("access service", () => {
  it("assigns default landing views by role", () => {
    expect(getDefaultViewForRole("tourist")).toBe("overview");
    expect(getDefaultViewForRole("admin")).toBe("dashboard");
  });

  it("keeps tourist users out of administrator views", () => {
    expect(getAllowedViewsForRole("tourist")).toEqual(["overview", "tracking", "history", "recommendations", "profile"]);
    expect(canAccessView("tourist", "dashboard")).toBe(false);
    expect(coerceViewForRole("tourist", "records")).toBe("overview");
  });

  it("keeps administrator users out of tourist-only tracking views", () => {
    expect(getAllowedViewsForRole("admin")).toEqual(["dashboard", "destinations"]);
    expect(canAccessView("admin", "tracking")).toBe(false);
    expect(coerceViewForRole("admin", "records")).toBe("dashboard");
    expect(coerceViewForRole("admin", "history")).toBe("dashboard");
  });
});
