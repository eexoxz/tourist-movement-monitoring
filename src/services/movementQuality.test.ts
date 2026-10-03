import { describe, expect, it } from "vitest";
import type { MovementPoint } from "../types";
import { initialData } from "../data/demoData";
import { filterQualityMovementPoints, getMovementQualityIssue, isContinuousMovementSegment } from "./movementQuality";
import { appendMovementPoint, createSampleTripForUser, grantLocationConsent, startTripSession, summarizeTrip } from "./movement";

const now = Date.now();
const point: MovementPoint = { id: "point", tripId: "trip", userId: "tourist-demo", latitude: 5.4141, longitude: 100.3288, accuracyMeters: 20, recordedAt: new Date(now).toISOString(), source: "browser" };

describe("movement quality safeguards", () => {
  it("rejects unreliable accuracy, stale readings and future timestamps", () => {
    expect(getMovementQualityIssue({ ...point, accuracyMeters: 1000 }, undefined, now)).toBe("accuracy");
    expect(getMovementQualityIssue({ ...point, accuracyMeters: NaN }, undefined, now)).toBe("accuracy");
    expect(getMovementQualityIssue({ ...point, recordedAt: new Date(now - 6 * 60000).toISOString() }, undefined, now, true)).toBe("timestamp");
    expect(getMovementQualityIssue({ ...point, recordedAt: new Date(now + 2 * 60000).toISOString() }, undefined, now)).toBe("timestamp");
    expect(getMovementQualityIssue({ ...point, recordedAt: "invalid" }, undefined, now)).toBe("timestamp");
  });

  it("skips a Penang-to-KL jump but permits driving and GPS jitter", () => {
    const previous = { ...point, recordedAt: new Date(now - 60000).toISOString() };
    expect(getMovementQualityIssue({ ...point, latitude: 3.15, longitude: 101.7 }, previous, now)).toBe("jump");
    expect(getMovementQualityIssue({ ...point, latitude: point.latitude + 0.005 }, previous, now)).toBeNull();
    expect(getMovementQualityIssue({ ...point, latitude: point.latitude + 0.0002 }, { ...previous, recordedAt: point.recordedAt }, now)).toBeNull();
  });

  it("does not treat synthetic points as the baseline for observed GPS", () => {
    const previous = { ...point, latitude: 3.15, longitude: 101.7, source: "demo" as const };
    expect(getMovementQualityIssue(point, previous, now)).toBeNull();
    expect(filterQualityMovementPoints([previous, point], now)).toHaveLength(2);
  });

  it("recovers after a long tracking gap without counting an unknown connecting journey", () => {
    const previous = { ...point, latitude: 3.15, longitude: 101.7, recordedAt: new Date(now - 2 * 3600000).toISOString() };
    expect(getMovementQualityIssue(point, previous, now)).toBeNull();
    expect(isContinuousMovementSegment(previous, point)).toBe(false);
    expect(isContinuousMovementSegment({ ...previous, source: "demo" }, point)).toBe(false);
  });

  it("filters old bad records without removing valid recovery points", () => {
    const previous = { ...point, id: "first", recordedAt: new Date(now - 60000).toISOString() };
    const jump = { ...point, id: "jump", latitude: 3.15, longitude: 101.7, recordedAt: new Date(now - 30000).toISOString() };
    const inaccurate = { ...point, id: "inaccurate", accuracyMeters: 800 };
    const invalid = { ...point, id: "invalid", longitude: Infinity };
    expect(filterQualityMovementPoints([jump, previous, inaccurate, invalid, point], now).map((reading) => reading.id)).toEqual(["first", "point"]);
  });

  it("rejects bad live samples before storage and excludes legacy jumps from distance", () => {
    const started = startTripSession(grantLocationConsent({ ...initialData, trips: [], points: [] }, "tourist-demo"), "tourist-demo");
    const first = { ...point, tripId: started.trip!.id, recordedAt: new Date(Date.now() - 60000).toISOString() };
    const data = { ...started.data!, points: [first] };
    const jumpInput = { tripId: first.tripId, latitude: 3.15, longitude: 101.7, accuracyMeters: 20, source: "browser" as const };
    expect(appendMovementPoint(data, jumpInput).qualityIssue).toBe("jump");
    expect(appendMovementPoint(data, { ...jumpInput, ...point, tripId: first.tripId, accuracyMeters: 999 }).qualityIssue).toBe("accuracy");
    const summary = summarizeTrip({ ...data, points: [first, { ...first, ...jumpInput, id: "legacy-jump", recordedAt: new Date().toISOString() }] }, first.tripId);
    expect(summary.distanceKm).toBe(0);
    expect(summary.pointCount).toBe(1);
  });

  it("does not generate a distant sample route for an uncovered district", () => {
    const result = createSampleTripForUser(initialData, "tourist-demo", { latitude: 6.1248, longitude: 100.3678 });
    expect(result.error).toContain("Not enough");
    expect(result.data).toBeUndefined();
  });
});
