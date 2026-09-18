import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { buildTourismAdvisories, getRelevantTourismAdvisories } from "./advisories";

describe("tourism advisories", () => {
  it("builds current local advisories without live external APIs", () => {
    const now = new Date("2026-09-18T08:00:00.000Z");
    const advisories = buildTourismAdvisories(now);

    expect(advisories.length).toBeGreaterThan(0);
    expect(advisories[0].startsAt).toContain("2026");
    expect(advisories.map((advisory) => advisory.type)).toContain("weather");
    expect(advisories.map((advisory) => advisory.type)).toContain("road-closure");
  });

  it("prioritizes advisories near the tourist latest point", () => {
    const now = new Date("2026-09-18T08:00:00.000Z");
    const advisories = getRelevantTourismAdvisories({
      destinations: initialData.destinations,
      activePoint: { id: "point", tripId: "trip", userId: "tourist-demo", latitude: 5.4141, longitude: 100.3288, accuracyMeters: 20, recordedAt: now.toISOString(), source: "demo" },
      now,
    });

    expect(advisories[0].city).toBe("Penang");
    expect(advisories.some((advisory) => advisory.type === "weather")).toBe(true);
  });
});
