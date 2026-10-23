import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData, MovementPoint, TripSession } from "../types";
import { calculateDestinationDemand } from "./analytics";
import { buildDestinationActivitySummaries, createTouristDemandSelector, getTouristDestinationDemand, isFreshActivitySummary } from "./activitySummary";
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
  it("reuses unchanged activity through unrelated updates without retaining another account's result", () => {
    const select = createTouristDemandSelector();
    const data = activityData();
    const user = data.users[0];
    const first = select(data, user, now);
    expect(select({ ...data, sosAlerts: [] }, { ...user, name: "Updated name" }, now + 1)).toBe(first);
    expect(first).toEqual(getTouristDestinationDemand(data, user, now));
    const switched = select(data, { ...user, id: "another-account" }, now + 2);
    expect(switched).not.toBe(first);
    expect(select(data, user, now + 3)).not.toBe(switched);
    expect(createTouristDemandSelector()(data, user, now)).not.toBe(first);
  });

  it("invalidates activity reuse for changed inputs, source preferences, clock rollback and expiry", () => {
    const data = activityData();
    const user = data.users[0];
    const changes = [
      { ...data, points: [...data.points] },
      { ...data, trips: [...data.trips] },
      { ...data, destinations: [...data.destinations] },
    ];
    for (const changed of changes) {
      const select = createTouristDemandSelector();
      const first = select(data, user, now);
      const next = select(changed, user, now + 1);
      expect(next).not.toBe(first);
      expect(next).toEqual(getTouristDestinationDemand(changed, user, now + 1));
    }
    const select = createTouristDemandSelector();
    const first = select(data, user, now);
    const observed = select(data, { ...user, sampleActivityEnabled: false }, now + 1);
    expect(observed).not.toBe(first);
    const rolledBack = select(data, { ...user, sampleActivityEnabled: false }, now);
    expect(rolledBack).not.toBe(observed);
    expect(select(data, { ...user, sampleActivityEnabled: false }, now + 5000)).not.toBe(rolledBack);
  });

  it("does not reuse a shared band beyond its exact freshness boundary", () => {
    const user = { ...initialData.users[0], authUid: "cloud-tourist" };
    const data = { ...activityData(), points: [], destinations: buildDestinationActivitySummaries(activityData(), now) };
    const select = createTouristDemandSelector();
    const boundary = now + 24 * 3600000;
    const fresh = select(data, user, boundary);
    expect(fresh[0].popularityScore).toBe(100);
    const expired = select(data, user, boundary + 1);
    expect(expired).not.toBe(fresh);
    expect(expired[0].popularityScore).toBe(0);
    expect(expired).toEqual(getTouristDestinationDemand(data, user, boundary + 1));
  });

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
