import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData, MovementPoint, TripSession } from "../types";
import { calculateDestinationDemand } from "./analytics";
import { buildDestinationActivitySummaries, getTouristDestinationDemand, isFreshActivitySummary } from "./activitySummary";
import { activityText } from "./activityCopy";
import { localeOptions } from "./i18n";

const now = Date.now();
const destination = initialData.destinations[0];
function activityData(visitorCount = 3, source: MovementPoint["source"] = "browser"): AppData {
  const trips: TripSession[] = Array.from({ length: visitorCount }, (_, index) => ({ id: `trip-${index}`, userId: `visitor-${index}`, status: "completed", startedAt: new Date(now - 600000).toISOString(), consentId: `consent-${index}` }));
  const points: MovementPoint[] = trips.map((trip, index) => ({ id: `point-${index}`, tripId: trip.id, userId: trip.userId, latitude: destination.latitude, longitude: destination.longitude, accuracyMeters: 20, source, recordedAt: new Date(now - 300000).toISOString() }));
  const users = trips.map((trip) => ({ ...initialData.users[0], id: trip.userId, role: "tourist" as const }));
  return { ...initialData, users, destinations: [destination], trips, points, checkIns: [] };
}

describe("bounded and anonymous place activity", () => {
  it("does not reward repeated samples from one visitor on one day", () => {
    const data = activityData();
    const otherDestination = initialData.destinations[1];
    const otherTrips = data.trips.map((trip) => ({ ...trip, id: `${trip.id}-other` }));
    data.destinations = [destination, otherDestination];
    data.trips = [...data.trips, ...otherTrips];
    data.points = [...data.points, ...otherTrips.map((trip, index) => ({ ...data.points[index], id: `other-${index}`, tripId: trip.id, latitude: otherDestination.latitude, longitude: otherDestination.longitude }))];
    const repeated = { ...data, points: [...data.points, ...Array.from({ length: 500 }, (_, index) => ({ ...data.points[0], id: `repeat-${index}` }))] };
    const original = calculateDestinationDemand(data, { now })[0];
    const inflated = calculateDestinationDemand(repeated, { now })[0];
    expect(inflated.movementPointCount).toBeGreaterThan(original.movementPointCount);
    expect(inflated.popularityScore).toBe(original.popularityScore);
    expect(inflated.uniqueTouristCount).toBe(3);
    expect(calculateDestinationDemand(repeated, { now }).find((row) => row.destinationId === otherDestination.id)?.popularityScore).toBe(100);
    expect(calculateDestinationDemand(activityData(1), { now })[0].tier).toBe("low");
  });

  it("shares an activity band without identities, precise times or visitor counts", () => {
    const summary = buildDestinationActivitySummaries(activityData(), now)[0].activitySummary!;
    expect(summary.tier).toBe("high");
    expect(Object.keys(summary).sort()).toEqual(["popularityScore", "tier", "updatedAt", "version", "windowDays"]);
    expect(JSON.stringify(summary)).not.toContain("visitor-");
    expect(summary.updatedAt).toBe(new Date(now).toISOString());
  });

  it("suppresses small cohorts, sample movement, old activity and bad GPS", () => {
    expect(buildDestinationActivitySummaries(activityData(2), now)[0].activitySummary?.popularityScore).toBe(0);
    expect(buildDestinationActivitySummaries(activityData(300, "demo"), now)[0].activitySummary?.popularityScore).toBe(0);
    const data = activityData();
    const old = { ...data, points: data.points.map((point) => ({ ...point, recordedAt: new Date(now - 8 * 86400000).toISOString() })) };
    const inaccurate = { ...data, points: data.points.map((point) => ({ ...point, accuracyMeters: 999 })) };
    expect(buildDestinationActivitySummaries(old, now)[0].activitySummary?.popularityScore).toBe(0);
    expect(buildDestinationActivitySummaries(inaccurate, now)[0].activitySummary?.popularityScore).toBe(0);
  });

  it("uses shared scores for signed-in tourists without reading other routes", () => {
    const data = activityData();
    const scopedData = { ...data, destinations: buildDestinationActivitySummaries(data, now), trips: [], points: [] };
    const user = { ...initialData.users[0], authUid: "cloud-tourist" };
    const demand = getTouristDestinationDemand(scopedData, user, now)[0];
    expect(demand.popularityScore).toBe(100);
    expect(demand.tier).toBe("high");
    expect(demand.movementPointCount).toBe(0);
    expect(demand.uniqueTouristCount).toBe(0);
    expect(getTouristDestinationDemand(data, user, now)[0].popularityScore).toBe(0);
  });

  it("does not publish activity for missing accounts or mismatched trip owners", () => {
    const data = activityData();
    expect(buildDestinationActivitySummaries({ ...data, users: [] }, now)[0].activitySummary?.popularityScore).toBe(0);
    expect(buildDestinationActivitySummaries({ ...data, points: data.points.map((point) => ({ ...point, userId: "unrelated-account" })) }, now)[0].activitySummary?.popularityScore).toBe(0);
  });

  it("expires shared activity and keeps demo previews separate", () => {
    const data = { ...activityData(), destinations: buildDestinationActivitySummaries(activityData(), now) };
    expect(isFreshActivitySummary(data.destinations[0].activitySummary, now + 25 * 3600000)).toBe(false);
    expect(isFreshActivitySummary({ ...data.destinations[0].activitySummary!, popularityScore: Infinity }, now)).toBe(false);
    expect(isFreshActivitySummary({ ...data.destinations[0].activitySummary!, updatedAt: new Date(now + 1000).toISOString() }, now)).toBe(false);
    expect(getTouristDestinationDemand(activityData(3, "demo"), initialData.users[0], now)[0].popularityScore).toBeGreaterThan(0);
    expect(getTouristDestinationDemand(data, { ...initialData.users[0], authUid: "cloud" }, now + 25 * 3600000)[0].popularityScore).toBe(0);
  });

  it("publishes sample bands separately and requires cloud tourists to opt in", () => {
    const observed = buildDestinationActivitySummaries(activityData(), now);
    const sampleData = { ...activityData(3, "demo"), destinations: observed };
    const destinations = buildDestinationActivitySummaries(sampleData, now, "demo");
    expect(destinations[0].activitySummary).toEqual(observed[0].activitySummary);
    expect(destinations[0].demoActivitySummary?.popularityScore).toBe(100);
    const user = { ...initialData.users[0], authUid: "cloud" };
    const scoped = { ...sampleData, destinations: destinations.map((place) => ({ ...place, activitySummary: undefined })), points: [], trips: [] };
    expect(getTouristDestinationDemand(scoped, user, now)[0].popularityScore).toBe(0);
    expect(getTouristDestinationDemand(scoped, { ...user, sampleActivityEnabled: true }, now)[0].popularityScore).toBe(100);
  });

  it("provides the new labels in every supported language", () => {
    for (const { value } of localeOptions) {
      for (const key of ["accuracy", "jump", "timestamp", "title", "hint", "publish", "publishSample", "previewSample", "refresh", "refreshFailed", "saved", "noEvidence", "demoBasis", "observedBasis", "localBasis"] as const) {
        expect(activityText(value, key).length).toBeGreaterThan(0);
      }
    }
  });
});
