import { afterEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import type { MovementPoint } from "../types";
import { clearBrowserLocationWatch, getLastBrowserLocationKey, loadLastBrowserLocation, movementPointFromBrowserPosition, saveLastBrowserLocation } from "./browserLocation";
import { appendMovementPoint, grantLocationConsent, startTripSession, stopActiveTrip, summarizeTrip } from "./movement";
import { getMovementQualityIssue } from "./movementQuality";
import { getLiveNearbySuggestion } from "./liveSuggestions";
import { recommendForUser } from "./analytics";
import { distanceKm } from "./geo";

function position(latitude: number, longitude: number, timestamp: number, accuracy = 15): GeolocationPosition {
  return { coords: { latitude, longitude, accuracy }, timestamp } as GeolocationPosition;
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("browser GPS workflow", () => {
  it("records a local route, recommends nearby places and completes without joining an old KL route", () => {
    vi.useFakeTimers();
    const start = Date.parse("2026-10-03T10:00:00Z");
    vi.setSystemTime(start);
    const user = initialData.users.find((user) => user.id === "tourist-demo")!;
    const started = startTripSession(grantLocationConsent(initialData, user.id), user.id);
    let data = started.data!;
    const tripId = started.trip!.id;
    const readings = [[5.373, 100.314], [5.386, 100.29], [5.399, 100.278]];
    let previous: MovementPoint | undefined;
    for (const [index, coordinates] of readings.entries()) {
      const timestamp = start + index * 10 * 60000;
      vi.setSystemTime(timestamp);
      const point = movementPointFromBrowserPosition(position(coordinates[0], coordinates[1], timestamp), tripId, user.id);
      expect(getMovementQualityIssue(point, previous, Date.now(), true)).toBeNull();
      const saved = appendMovementPoint(data, { ...point });
      expect(saved.error).toBeUndefined();
      data = saved.data!;
      previous = point;
    }
    const summary = summarizeTrip(data, tripId);
    expect(summary.distanceKm).toBeGreaterThan(1);
    expect(summary.distanceKm).toBeLessThan(15);
    expect(data.points.filter((point) => point.tripId === tripId)).toHaveLength(3);
    const suggestion = getLiveNearbySuggestion({ point: previous!, destinations: data.destinations, demand: [], user });
    expect(suggestion?.destination.id).toBe("kek-lok-si-temple");
    const recommendations = recommendForUser(user.id, data, undefined, [], previous, { localOnly: true, radiusKm: 25, ignoreHistoryLocation: true });
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((row) => distanceKm(previous!, data.destinations.find((destination) => destination.id === row.destinationId)!) <= 25)).toBe(true);
    const stopped = stopActiveTrip(data, user.id);
    expect(stopped.data!.trips.find((trip) => trip.id === tripId)?.status).toBe("completed");
    expect(appendMovementPoint(stopped.data!, { ...previous!, recordedAt: new Date().toISOString() }).error).toBeTruthy();
  });

  it("ignores inaccurate, stale and teleporting live readings", () => {
    const now = Date.now();
    const first = movementPointFromBrowserPosition(position(5.4, 100.28, now), "trip", "tourist");
    expect(getMovementQualityIssue(movementPointFromBrowserPosition(position(3.15, 101.69, now + 1000), "trip", "tourist"), first, now + 1000, true)).toBe("jump");
    expect(getMovementQualityIssue(movementPointFromBrowserPosition(position(5.4, 100.28, now, 1000), "trip", "tourist"), undefined, now, true)).toBe("accuracy");
    expect(getMovementQualityIssue(movementPointFromBrowserPosition(position(5.4, 100.28, now - 360000), "trip", "tourist"), undefined, now, true)).toBe("timestamp");
  });

  it("restores only valid browser locations belonging to the current tourist", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    const point = movementPointFromBrowserPosition(position(5.4, 100.28, Date.now()), "trip", "tourist");
    saveLastBrowserLocation("tourist", point);
    expect(loadLastBrowserLocation("tourist")).toEqual(point);
    for (const invalid of [{ ...point, userId: "someone-else" }, { ...point, source: "demo" }, { ...point, recordedAt: "invalid" }, { ...point, accuracyMeters: null }]) {
      storage.set(getLastBrowserLocationKey("tourist"), JSON.stringify(invalid));
      expect(loadLastBrowserLocation("tourist")).toBeUndefined();
    }
    storage.set(getLastBrowserLocationKey("tourist"), "not json");
    expect(loadLastBrowserLocation("tourist")).toBeUndefined();
  });

  it("clears watch ID zero and does not clear an already stopped watch", () => {
    const clearWatch = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { clearWatch } });
    const watch = { current: 0 as number | null };
    clearBrowserLocationWatch(watch);
    clearBrowserLocationWatch(watch);
    expect(clearWatch).toHaveBeenCalledExactlyOnceWith(0);
    expect(watch.current).toBeNull();
  });
});
