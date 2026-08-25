import { describe, expect, it } from "vitest";
import {
  canAccessView,
  coerceViewForRole,
  getAllowedViewsForRole,
  getAuthModeFromPath,
  getDefaultViewForRole,
  getPathForAuthMode,
  getPathForView,
  getPrimaryViewsForRole,
  getViewFromPath,
} from "./access";

describe("access service", () => {
  it("assigns default landing views by role", () => {
    expect(getDefaultViewForRole("tourist")).toBe("overview");
    expect(getDefaultViewForRole("admin")).toBe("dashboard");
  });

  it("keeps tourist users out of administrator views", () => {
    expect(getAllowedViewsForRole("tourist")).toEqual(["overview", "tracking", "history", "recommendations", "profile"]);
    expect(getPrimaryViewsForRole("tourist")).toEqual(["overview", "history", "recommendations"]);
    expect(canAccessView("tourist", "dashboard")).toBe(false);
    expect(coerceViewForRole("tourist", "records")).toBe("overview");
  });

  it("keeps administrator users out of tourist-only tracking views", () => {
    expect(getAllowedViewsForRole("admin")).toEqual(["dashboard", "destinations"]);
    expect(getPrimaryViewsForRole("admin")).toEqual(["dashboard", "destinations"]);
    expect(canAccessView("admin", "tracking")).toBe(false);
    expect(coerceViewForRole("admin", "records")).toBe("dashboard");
    expect(coerceViewForRole("admin", "history")).toBe("dashboard");
  });

  it("maps auth screens to stable browser paths", () => {
    expect(getPathForAuthMode("login")).toBe("/login");
    expect(getPathForAuthMode("register")).toBe("/register");
    expect(getAuthModeFromPath("/")).toBe("login");
    expect(getAuthModeFromPath("/login")).toBe("login");
    expect(getAuthModeFromPath("/register")).toBe("register");
    expect(getAuthModeFromPath("/app/home")).toBeNull();
  });

  it("maps app views to role-aware browser paths", () => {
    expect(getPathForView("tourist", "overview")).toBe("/app/home");
    expect(getPathForView("tourist", "history")).toBe("/app/trips");
    expect(getPathForView("tourist", "dashboard")).toBe("/app/home");
    expect(getPathForView("admin", "dashboard")).toBe("/admin/dashboard");
    expect(getPathForView("admin", "destinations")).toBe("/admin/destinations");
    expect(getPathForView("admin", "recommendations")).toBe("/admin/dashboard");
  });

  it("reads app views from browser paths", () => {
    expect(getViewFromPath("/app/home")).toBe("overview");
    expect(getViewFromPath("/app/trips")).toBe("history");
    expect(getViewFromPath("/app/recommendations")).toBe("recommendations");
    expect(getViewFromPath("/app/profile/")).toBe("profile");
    expect(getViewFromPath("/admin/dashboard")).toBe("dashboard");
    expect(getViewFromPath("/admin/destinations")).toBe("destinations");
    expect(getViewFromPath("/unknown")).toBeNull();
  });
});
