import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { summarizeTrip } from "./movement";
import { getTouristWorkspaceData } from "./touristWorkspace";
import { buildMovementRecordsCsv, getMovementRecords, getMovementTripRecords } from "./dashboard";

describe("recorded trip time across views", () => {
  const now = Date.now();
  const trip = { id: "old-unfinished", userId: "tourist-demo", status: "active" as const, consentId: "consent", startedAt: new Date(now - 60 * 86400000).toISOString() };
  const point = { tripId: trip.id, userId: trip.userId, latitude: 5.25, longitude: 100.45, accuracyMeters: 15, source: "browser" as const };
  const data = { ...initialData, destinations: [], checkIns: [], trips: [trip], points: [
    { ...point, id: "old", recordedAt: trip.startedAt },
    { ...point, id: "new1", recordedAt: new Date(now - 600000).toISOString() },
    { ...point, id: "new2", recordedAt: new Date(now).toISOString() },
  ] };
  it("keeps tourist, admin and service durations consistent after a months-long gap", () => {
    const expected = summarizeTrip(data, trip.id);
    expect(expected.durationMinutes).toBe(10);
    expect(getTouristWorkspaceData(data, trip.userId, trip.id).selectedTripSummary).toEqual(expected);
    expect(getMovementTripRecords(data)[0].summary).toEqual(expected);
  });
  it("exports recorded time instead of elapsed calendar time", () => {
    const csv = buildMovementRecordsCsv(getMovementRecords(data));
    expect(csv.split("\n").slice(1).every(row => row.endsWith('"0","10","0"'))).toBe(true);
  });
});
