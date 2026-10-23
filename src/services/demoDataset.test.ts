import { afterEach, describe, expect, it, vi } from "vitest";
import { demoDatasetMetadata, getPreparedDemoTouristCount, initialData, isSampleTourist } from "../data/demoData";
import { demoDatasetCountries, previewDemoDataset, replaceDemoDataset } from "./demoDataset";
import { applyDemoDatasetSelection, rememberDemoDatasetSelection } from "./demoDatasetSelection";
import { refreshAllRecommendations } from "./analytics";

const filters = { countries: demoDatasetCountries, preference: "all" as const, limit: 20 };
afterEach(() => vi.unstubAllGlobals());

describe("bounded selectable sample datasets", () => {
  it("previews the exact prepared records for multiple countries and a travel interest", () => {
    const preview = previewDemoDataset(initialData, { countries: ["Australia", "New Zealand"], preference: "cultural", limit: 100 });
    const users = initialData.users.filter((user) => preview.userIds.has(user.id));
    expect(users.length).toBeGreaterThan(1);
    expect(new Set(users.map((user) => user.nationality))).toEqual(new Set(["Australia", "New Zealand"]));
    expect(users.every((user) => user.travelPreferences?.includes("cultural"))).toBe(true);
    expect(preview.matchingCount).toBe(users.length);
    expect(preview.trips).toBe(initialData.trips.filter((trip) => preview.userIds.has(trip.userId)).length);
    expect(preview.points).toBe(initialData.points.filter((point) => preview.userIds.has(point.userId ?? "")).length);
    expect(preview.checkIns).toBe(initialData.checkIns.filter((visit) => preview.userIds.has(visit.userId)).length);
    expect(previewDemoDataset(initialData, filters)).toEqual(previewDemoDataset(initialData, filters));
  });

  it("enforces empty filters, deterministic limits, point bounds and valid prepared IDs", () => {
    for (const limit of [20, 50, 100]) {
      const preview = previewDemoDataset(initialData, { ...filters, limit });
      expect(preview.touristCount).toBe(limit);
      expect(preview.matchingCount).toBe(100);
      expect(preview.points).toBeLessThanOrEqual(limit * demoDatasetMetadata.maxTripsPerTourist * demoDatasetMetadata.maxPointsPerTrip);
    }
    for (const countries of [[], ["Not a country"]]) expect(previewDemoDataset(initialData, { ...filters, countries }).touristCount).toBe(0);
    for (const limit of [-1, 0, 21, 101, Number.NaN]) expect(() => previewDemoDataset(initialData, { ...filters, limit })).toThrow();
    expect(() => replaceDemoDataset(initialData, new Set(["actual-user"]))).toThrow();
  });

  it("replaces rather than appends, clears stale analyses and preserves genuine history", () => {
    const user = { ...initialData.users[0], id: "registered-user", authUid: "registered-user", email: "qa@example.test" };
    const trip = { ...initialData.trips[0], id: "actual-trip", userId: user.id };
    const point = { ...initialData.points[0], id: "actual-point", userId: user.id, tripId: trip.id, source: "browser" as const };
    const visit = { ...initialData.checkIns[0], id: "actual-visit", userId: user.id, tripId: trip.id };
    const sos = { ...initialData.sosAlerts[0], id: "actual-sos", userId: user.id };
    const report = { ...initialData.incidentReports[0], id: "actual-report", userId: user.id };
    const data = refreshAllRecommendations({ ...initialData, users: [...initialData.users, user], trips: [...initialData.trips, trip], points: [...initialData.points, point], checkIns: [...initialData.checkIns, visit], sosAlerts: [...initialData.sosAlerts, sos], incidentReports: [...initialData.incidentReports, report] });
    const selected = previewDemoDataset(data, { ...filters, countries: ["New Zealand"], limit: 20 });
    const next = replaceDemoDataset(data, selected.userIds);
    expect(getPreparedDemoTouristCount(next)).toBe(selected.touristCount);
    expect(next.points).toHaveLength(selected.points + 1);
    expect(next.trips).toHaveLength(selected.trips + 1);
    expect(next.points).toContain(point);
    expect(next.checkIns).toContain(visit);
    expect(next.sosAlerts).toEqual([sos]);
    expect(next.incidentReports).toEqual([report]);
    expect(next.users).toContain(user);
    expect(next.analyses.every((analysis) => analysis.userId === user.id)).toBe(true);
    expect(next.destinations).toBe(data.destinations);
    const reloaded = replaceDemoDataset(next, selected.userIds);
    expect(reloaded.points).toEqual(next.points);
    const cleared = replaceDemoDataset(reloaded, new Set());
    expect(cleared.trips).toEqual([trip]);
    expect(cleared.points).toEqual([point]);
    expect(cleared.checkIns).toEqual([visit]);
    expect(cleared.sosAlerts).toEqual([sos]);
    expect(cleared.incidentReports).toEqual([report]);
    expect(getPreparedDemoTouristCount(cleared)).toBe(0);
  });

  it("does not attach prepared movement to an authenticated account using a reserved sample ID", () => {
    const actual = { ...initialData.users.find((user) => user.id === "tourist-seed-001")!, authUid: "real-owner" };
    const data = { ...initialData, users: initialData.users.map((user) => user.id === actual.id ? actual : user), trips: [], points: [], consents: [], checkIns: [] };
    const preview = previewDemoDataset(data, { ...filters, limit: 100 });
    expect(preview.touristCount).toBe(99);
    expect(preview.userIds.has(actual.id)).toBe(false);
    const next = replaceDemoDataset(data, new Set([actual.id]));
    expect(next.users.find((user) => user.id === actual.id)).toBe(actual);
    expect(next.points).toEqual([]);
    expect(next.trips).toEqual([]);
    expect(next.checkIns).toEqual([]);
  });

  it("migrates legacy selections, filters late legacy records and restores only the chosen subset", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    const legacy = { ...initialData.users[0], id: "tourist-seed-250" };
    const trip = { ...initialData.trips[0], id: "trip-seed-250-1", userId: legacy.id };
    const point = { ...initialData.points[0], id: "legacy-point", tripId: trip.id, userId: undefined };
    const data = { ...initialData, users: [...initialData.users, legacy], trips: [...initialData.trips, trip], points: [...initialData.points, point] };
    const migrated = applyDemoDatasetSelection(data);
    expect(migrated.users).not.toContain(legacy);
    expect(migrated.points).not.toContain(point);
    values.set("tourist-movement-monitoring:demo-dataset-selection", JSON.stringify(Array.from({ length: 300 }, (_, index) => `tourist-seed-${String(index + 1).padStart(3, "0")}`)));
    expect(getPreparedDemoTouristCount(applyDemoDatasetSelection(data, true))).toBe(100);
    const selected = replaceDemoDataset(data, previewDemoDataset(data, filters).userIds);
    rememberDemoDatasetSelection(selected);
    expect(getPreparedDemoTouristCount(applyDemoDatasetSelection(data, true))).toBe(20);
    expect(applyDemoDatasetSelection(data).users.filter(isSampleTourist).some((user) => user.id === legacy.id)).toBe(false);
    rememberDemoDatasetSelection(replaceDemoDataset(selected, new Set()));
    expect(applyDemoDatasetSelection(data, true).points).toEqual([]);
  });
});
