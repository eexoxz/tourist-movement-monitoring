import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { MovementPoint } from "../types";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { getRecordedStopIds } from "./stopEvidence";
import { getVisitedDestinationIds, createSampleTripForUser, summarizeTrip } from "./movement";
import { getTouristWorkspaceData } from "./touristWorkspace";

const destination = initialData.destinations[0];
const index = createDestinationSpatialIndex([destination]);
const now = Date.now();
function point(minutesAgo: number): MovementPoint {
  return { id: `point-${minutesAgo}`, tripId: "stay-trip", userId: "visitor", latitude: destination.latitude, longitude: destination.longitude, accuracyMeters: 20, recordedAt: new Date(now - minutesAgo * 60000).toISOString(), source: "browser" };
}

describe("recorded stops versus nearby movement", () => {
  it("does not count a drive-by or a place one kilometre away as a visit", () => {
    expect(getRecordedStopIds([point(0)], index).size).toBe(0);
    expect(getRecordedStopIds([point(1), point(0)], index).size).toBe(0);
    expect(getRecordedStopIds([point(3), point(0)].map((reading) => ({ ...reading, latitude: reading.latitude + 0.009 })), index).size).toBe(0);
  });

  it("recognises a short stay but not a long gap or separate trips", () => {
    expect(getRecordedStopIds([point(3), point(0)], index).has(destination.id)).toBe(true);
    expect(getRecordedStopIds([point(10), point(0)], index).size).toBe(0);
    expect(getRecordedStopIds([point(3), { ...point(0), tripId: "other" }], index).size).toBe(0);
  });

  it("does not join stays across an intervening movement away", () => {
    const away = { ...point(2), latitude: destination.latitude + 0.006 };
    expect(getRecordedStopIds([point(4), away, point(1), point(0)], index).size).toBe(0);
  });

  it("keeps explicit visit logs and workspace summaries consistent", () => {
    const trip = { id: "stay-trip", userId: "visitor", consentId: "consent", status: "completed" as const, startedAt: point(3).recordedAt };
    const data = { ...initialData, destinations: [destination], trips: [trip], points: [point(0)], checkIns: [{ id: "visit", userId: "visitor", destinationId: destination.id, tripId: trip.id, status: "checked-in" as const, checkedInAt: point(0).recordedAt }] };
    expect(getVisitedDestinationIds(data, "visitor").has(destination.id)).toBe(true);
    expect(summarizeTrip(data, trip.id).visitedDestinationCount).toBe(1);
    expect(getTouristWorkspaceData(data, "visitor", trip.id).selectedTripSummary).toEqual(summarizeTrip(data, trip.id));
  });

  it("keeps simulated routes useful without granting actual GPS consent", () => {
    const data = { ...initialData, consents: [] };
    const result = createSampleTripForUser(data, "tourist-demo");
    expect(result.error).toBeUndefined();
    expect(result.data?.consents).toEqual([]);
    const demoPoints = result.data!.points.filter((reading) => reading.tripId === result.tripId);
    expect(getRecordedStopIds(demoPoints, createDestinationSpatialIndex(data.destinations)).size).toBeGreaterThan(0);
  });
});
