import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { refreshAllRecommendations } from "./analytics";
import {
  buildMovementRecordsCsv,
  getDailyMovementTrend,
  getDestinationCategoryCoverage,
  getMovementDataStatus,
  getMovementRecords,
  getProfileDistribution,
  getTourists,
  getTripFilterOptions,
  summarizeDashboard,
} from "./dashboard";

describe("dashboard service", () => {
  it("summarizes tourist, consent, trip, point, and destination totals", () => {
    const summary = summarizeDashboard(initialData);

    expect(summary).toEqual({
      touristCount: initialData.users.filter((user) => user.role === "tourist").length,
      consentedTouristCount: initialData.consents.filter((consent) => consent.granted).length,
      activeTripCount: 0,
      completedTripCount: initialData.trips.filter((trip) => trip.status === "completed").length,
      movementPointCount: initialData.points.length,
      destinationCount: initialData.destinations.length,
    });
  });

  it("reports whether movement data is available for the admin dashboard", () => {
    expect(getMovementDataStatus(initialData).hasMovementData).toBe(true);
    expect(getMovementDataStatus({ ...initialData, points: [] }).message).toContain("No tourist movement records");
  });

  it("lists tourist accounts separately from administrator accounts", () => {
    const tourists = getTourists(initialData);

    expect(tourists.length).toBeGreaterThanOrEqual(100);
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

  it("filters movement records by trip and date range", () => {
    const dateKey = initialData.points.find((point) => point.tripId === "trip-demo-2")!.recordedAt.slice(0, 10);
    const expectedCount = initialData.points.filter((point) => point.tripId === "trip-demo-2" && point.recordedAt.startsWith(dateKey)).length;
    const records = getMovementRecords(initialData, {
      tripId: "trip-demo-2",
      fromDate: dateKey,
      toDate: dateKey,
    });

    expect(records).toHaveLength(expectedCount);
    expect(records.every((record) => record.point.tripId === "trip-demo-2")).toBe(true);
    expect(records.every((record) => record.point.recordedAt.startsWith(dateKey))).toBe(true);
  });

  it("returns trip filter options for a selected tourist", () => {
    const trips = getTripFilterOptions(initialData, "tourist-demo");

    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe("trip-demo-1");
  });

  it("builds a CSV export from visible movement records", () => {
    const records = getMovementRecords(initialData, "tourist-demo");
    const csv = buildMovementRecordsCsv(records);

    expect(csv).toContain('"tourist","trip_id","recorded_at"');
    expect(csv).toContain('"Demo Tourist"');
    expect(csv).toContain('"Merdeka Square"');
    expect(csv).toContain('"trip_distance_km"');
    expect(csv).toContain('"trip_duration_minutes"');
    expect(csv).toContain('"trip_visited_destinations"');
  });

  it("counts destination coverage across every supported category", () => {
    const coverage = getDestinationCategoryCoverage(initialData);

    expect(coverage).toEqual({
      cultural: 6,
      nature: 5,
      urban: 2,
      heritage: 5,
      food: 3,
      coastal: 1,
    });
  });

  it("tracks profile distribution and recent movement trends for dashboard charts", () => {
    const refreshed = refreshAllRecommendations(initialData);
    const profiles = getProfileDistribution(refreshed);
    const trend = getDailyMovementTrend(initialData, 30);
    const totalTrendPoints = Object.values(trend).reduce((total, count) => total + count, 0);

    expect(profiles.mixed).toBeGreaterThan(1);
    expect(profiles.nature).toBeGreaterThan(1);
    expect(profiles.cultural).toBeGreaterThan(1);
    expect(profiles.urban).toBeGreaterThan(1);
    expect(Object.keys(trend)).toHaveLength(30);
    expect(totalTrendPoints).toBe(initialData.points.length);
  });
});
