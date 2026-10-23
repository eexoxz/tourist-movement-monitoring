import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPreparedDemoTouristCount, initialData, mergePreparedDemoDataset, removeGeneratedDemoDataset } from "../data/demoData";
import { applyDemoDatasetSelection, rememberDemoDatasetSelection } from "./demoDatasetSelection";
import { cacheLocalData, loadData, normalizeAppData } from "./storage";
import { mergeMonitoringSnapshot } from "./monitoringSync";
import { calculateDestinationSignals } from "./mapSignals";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe("durable local demo selection", () => {
  it("keeps removal across cache reloads and filters late user, trip and point snapshots", () => {
    const cleaned = removeGeneratedDemoDataset(initialData);
    rememberDemoDatasetSelection(cleaned);
    cacheLocalData(cleaned);
    const point = initialData.points.find((row) => row.userId === "tourist-seed-001")!;
    const trip = initialData.trips.find((row) => row.id === point.tripId)!;
    const user = initialData.users.find((row) => row.id === trip.userId)!;
    let data = normalizeAppData(JSON.parse(JSON.stringify(initialData)));
    for (const snapshot of [
      { key: "points" as const, collection: "movement_records" as const, records: [{ ...point, userId: undefined }, { ...point, id: "legacy-orphan", tripId: "trip-seed-002", userId: undefined }], removed: [] },
      { key: "trips" as const, collection: "trip_sessions" as const, records: [trip], removed: [] },
      { key: "users" as const, collection: "users" as const, records: [user], removed: [] },
    ]) data = cacheLocalData(mergeMonitoringSnapshot(data, snapshot, []));
    expect(getPreparedDemoTouristCount(data)).toBe(0);
    expect(data.points).toEqual(normalizeAppData(cleaned).points);
    expect(loadData()).toBe(data);
    expect(calculateDestinationSignals(data.destinations, data.points)).toEqual(calculateDestinationSignals(cleaned.destinations, cleaned.points));
    expect(applyDemoDatasetSelection(data)).toBe(data);
  });

  it("restores only explicitly loaded batches instead of all 300 cloud samples", () => {
    const cleaned = removeGeneratedDemoDataset(initialData);
    rememberDemoDatasetSelection(cleaned);
    let selected = mergePreparedDemoDataset(cleaned);
    rememberDemoDatasetSelection(selected);
    const stale = applyDemoDatasetSelection(initialData, true);
    expect(getPreparedDemoTouristCount(stale)).toBe(50);
    const remoteOnly = { ...cleaned, users: [], consents: [], trips: [], points: [], checkIns: [] };
    const restored = applyDemoDatasetSelection(remoteOnly, true);
    expect(getPreparedDemoTouristCount(restored)).toBe(50);
    expect(restored.points).toEqual(stale.points);
    selected = mergePreparedDemoDataset(selected);
    rememberDemoDatasetSelection(selected);
    expect(getPreparedDemoTouristCount(applyDemoDatasetSelection(initialData, true))).toBe(100);
    rememberDemoDatasetSelection(cleaned);
    expect(getPreparedDemoTouristCount(applyDemoDatasetSelection(initialData, true))).toBe(0);
  });

  it("preserves authenticated owners, browser GPS, visits and safety history", () => {
    const sample = initialData.users.find((row) => row.id === "tourist-seed-001")!;
    const actual = { ...sample, id: "firebase-real-tourist", authUid: "firebase-real-tourist", email: "traveller@example.test" };
    const protectedOwner = { ...sample, authUid: "authenticated-owner" };
    const trip = { ...initialData.trips[0], id: "actual-trip", userId: actual.id };
    const point = { ...initialData.points[0], id: "actual-point", tripId: trip.id, userId: actual.id, source: "browser" as const };
    const checkIn = { ...initialData.checkIns[0], id: "actual-checkin", tripId: trip.id, userId: actual.id };
    const sos = { ...initialData.sosAlerts[0], id: "actual-sos", userId: actual.id };
    const report = { ...initialData.incidentReports[0], id: "actual-report", userId: actual.id };
    const data = { ...initialData, users: [...initialData.users.filter((row) => row.id !== sample.id), protectedOwner, actual], trips: [...initialData.trips, trip], points: [...initialData.points, point], checkIns: [...initialData.checkIns, checkIn], sosAlerts: [...initialData.sosAlerts, sos], incidentReports: [...initialData.incidentReports, report] };
    rememberDemoDatasetSelection(removeGeneratedDemoDataset(data));
    const retained = applyDemoDatasetSelection(data);
    expect(retained.users).toContain(protectedOwner);
    expect(retained.users).toContain(actual);
    expect(retained.trips).toContain(trip);
    expect(retained.points).toContain(point);
    expect(retained.checkIns).toContain(checkIn);
    expect(retained.sosAlerts).toContain(sos);
    expect(retained.incidentReports).toContain(report);
    expect(retained.points.filter((row) => row.userId === sample.id)).toEqual(data.points.filter((row) => row.userId === sample.id));
    expect(retained.destinations).toBe(data.destinations);
  });
});
