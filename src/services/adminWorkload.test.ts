import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminWorkspace } from "../workspaces/AdminWorkspace";
import { initialData } from "../data/demoData";
import * as analytics from "./analytics";
import * as geofencing from "./geofencing";
import * as dashboard from "./dashboard";

afterEach(() => vi.restoreAllMocks());

describe("admin page workloads", () => {
  it("skips history analytics in the catalogue editor while preserving overview calculations", () => {
    const demand = vi.spyOn(analytics, "calculateDestinationDemand");
    const plan = vi.spyOn(analytics, "createMovementBasedTravelPlan");
    const zones = vi.spyOn(geofencing, "calculateGeofenceActivity");
    const trend = vi.spyOn(dashboard, "getDailyMovementTrend");
    const render = (view: "destinations" | "dashboard") => renderToStaticMarkup(createElement(AdminWorkspace, {
      data: initialData, actor: initialData.users.find((user) => user.role === "admin")!,
      view, locale: "en", onDataChange: vi.fn(), notify: vi.fn(),
    }));
    expect(render("destinations")).toContain(initialData.destinations[0].name);
    for (const calculation of [demand, plan, zones, trend]) expect(calculation).not.toHaveBeenCalled();
    expect(render("dashboard")).toContain(String(initialData.points.length));
    for (const calculation of [demand, plan, zones, trend]) expect(calculation).toHaveBeenCalledTimes(1);
  });
});
