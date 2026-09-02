import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { calculateGeofenceActivity, getActiveGeofenceWarnings } from "./geofencing";

describe("geofencing service", () => {
  it("detects warning zones around a movement point", () => {
    const warnings = getActiveGeofenceWarnings({ latitude: 3.1556, longitude: 101.7139 }, initialData.geofences);

    expect(warnings.some((warning) => warning.geofence.id === "geofence-klcc-crowd")).toBe(true);
  });

  it("keeps far away points out of warning zones", () => {
    const warnings = getActiveGeofenceWarnings({ latitude: 6.1184, longitude: 100.3685 }, initialData.geofences);

    expect(warnings.some((warning) => warning.geofence.id === "geofence-klcc-crowd")).toBe(false);
  });

  it("summarizes geofence activity for administrators", () => {
    const activity = calculateGeofenceActivity(initialData);

    expect(activity.length).toBe(initialData.geofences.length);
    expect(activity.some((row) => row.pointCount > 0)).toBe(true);
  });
});
