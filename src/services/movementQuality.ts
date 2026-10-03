import type { MovementPoint } from "../types";
import { distanceKm } from "./geo";

export const movementQualityLimits = {
  accuracyMeters: 200,
  speedKmPerHour: 250,
  clockToleranceMs: 60000,
  liveReadingMaxAgeMs: 5 * 60 * 1000,
  continuousGapMs: 15 * 60 * 1000,
};

export type MovementQualityIssue = "accuracy" | "timestamp" | "jump";
type QualityPoint = Pick<MovementPoint, "latitude" | "longitude" | "accuracyMeters" | "recordedAt" | "source">;

export function getMovementQualityIssue(point: QualityPoint, previous?: QualityPoint, now = Date.now(), live = false): MovementQualityIssue | null {
  const timestamp = Date.parse(point.recordedAt);
  if (!Number.isFinite(timestamp) || (point.source === "browser" && (timestamp > now + movementQualityLimits.clockToleranceMs || (live && now - timestamp > movementQualityLimits.liveReadingMaxAgeMs)))) {
    return "timestamp";
  }
  if (point.source !== "browser") return null;
  if (!Number.isFinite(point.accuracyMeters) || point.accuracyMeters < 0 || point.accuracyMeters > movementQualityLimits.accuracyMeters) {
    return "accuracy";
  }
  if (!previous || previous.source !== "browser") return null;
  const elapsedMs = timestamp - Date.parse(previous.recordedAt);
  if (elapsedMs < 0) return "timestamp";
  if (elapsedMs > movementQualityLimits.continuousGapMs) return null;
  const distance = distanceKm(previous, point);
  // Allow measured GPS uncertainty before judging a rapid jump as travel.
  const uncertaintyKm = (point.accuracyMeters + previous.accuracyMeters) / 1000 + 0.05;
  const adjustedDistance = Math.max(0, distance - uncertaintyKm);
  if (adjustedDistance > 0.2 && adjustedDistance / Math.max(elapsedMs / 3600000, 1 / 3600) > movementQualityLimits.speedKmPerHour) {
    return "jump";
  }
  return null;
}

export function isContinuousMovementSegment(previous: QualityPoint, point: QualityPoint) {
  if (previous.source !== point.source) return false;
  return point.source === "demo" || Date.parse(point.recordedAt) - Date.parse(previous.recordedAt) <= movementQualityLimits.continuousGapMs;
}

export function filterQualityMovementPoints(points: MovementPoint[], now = Date.now()) {
  const previousByTrip = new Map<string, MovementPoint>();
  return [...points].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt)).filter((point) => {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return false;
    const previous = previousByTrip.get(point.tripId);
    if (getMovementQualityIssue(point, previous, now)) return false;
    if (point.source === "browser") previousByTrip.set(point.tripId, point);
    return true;
  });
}
