import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { refreshAllRecommendations } from "./analytics";
import {
  getDailyMovementTrend,
  getDestinationCategoryCoverage,
  getMovementRecords,
  getProfileDistribution,
  getTourists,
  summarizeDashboard,
} from "./dashboard";

describe("dashboard service", () => {
  it("summarizes tourist, consent, trip, point, and destination totals", () => {
    const summary = summarizeDashboard(initialData);

    expect(summary).toEqual({
      touristCount: 2,
      consentedTouristCount: 2,
      activeTripCount: 0,
      completedTripCount: 2,
      movementPointCount: 7,
      destinationCount: 10,
    });
  });

  it("lists tourist accounts separately from administrator accounts", () => {
    const tourists = getTourists(initialData);

    expect(tourists).toHaveLength(2);
    expect(tourists.every((tourist) => tourist.role === "tourist")).toBe(true);
  });

  it("filters movement records by selected tourist and enriches each point", () => {
    const records = getMovementRecords(initialData, "tourist-demo");

    expect(records).toHaveLength(4);
    expect(records.every((record) => record.trip?.userId === "tourist-demo")).toBe(true);
    expect(records.every((record) => record.tourist?.name === "Demo Tourist")).toBe(true);
    expect(records.every((record) => record.nearestDestinationName !== "Unmapped destination")).toBe(true);
    expect(records[0].point.id).toBe("point-demo-4");
  });

  it("keeps all movement records visible for the all-tourists view", () => {
    const records = getMovementRecords(initialData, "all");

    expect(records).toHaveLength(initialData.points.length);
  });

  it("counts destination coverage across every supported category", () => {
    const coverage = getDestinationCategoryCoverage(initialData);

    expect(coverage).toEqual({
      cultural: 2,
      nature: 2,
      urban: 1,
      heritage: 2,
      food: 2,
      coastal: 1,
    });
  });

  it("tracks profile distribution and recent movement trends for dashboard charts", () => {
    const refreshed = refreshAllRecommendations(initialData);
    const profiles = getProfileDistribution(refreshed);
    const trend = getDailyMovementTrend(initialData, 30);
    const totalTrendPoints = Object.values(trend).reduce((total, count) => total + count, 0);

    expect(profiles.mixed).toBe(1);
    expect(profiles.nature).toBe(1);
    expect(Object.keys(trend)).toHaveLength(30);
    expect(totalTrendPoints).toBe(initialData.points.length);
  });
});
