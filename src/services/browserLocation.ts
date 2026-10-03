import type { MovementPoint } from "../types";
import { movementQualityLimits } from "./movementQuality";

export const LAST_BROWSER_LOCATION_KEY_PREFIX = "tourist-movement-monitoring:last-location:";

export function geolocationErrorMessage(error: GeolocationPositionError) {
  const needsSecureContext = typeof window !== "undefined" && window.isSecureContext === false;

  if (needsSecureContext) {
    return "Phone browser GPS usually needs HTTPS. Use localhost for laptop testing, deploy to HTTPS, or add test movement for prototype checking.";
  }

  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. Tracking was stopped and no browser movement point was saved.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Current location is unavailable. Check device location settings or add a demo point for prototype testing.";
  }

  if (error.code === error.TIMEOUT) {
    return "Location request timed out. Move to a clearer signal area or try again.";
  }

  return error.message || "Location could not be read by the browser.";
}

export function hasBrowserGeolocation() {
  return typeof navigator !== "undefined" && Boolean(navigator.geolocation);
}

export function clearBrowserLocationWatch(watchId: { current: number | null }) {
  if (watchId.current === null) {
    return;
  }

  if (hasBrowserGeolocation()) {
    navigator.geolocation.clearWatch(watchId.current);
  }

  watchId.current = null;
}

export function getLastBrowserLocationKey(userId: string) {
  return `${LAST_BROWSER_LOCATION_KEY_PREFIX}${userId}`;
}

export function isStoredMovementPoint(value: unknown): value is MovementPoint {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as Partial<MovementPoint>;
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    typeof point.recordedAt === "string" &&
    Number.isFinite(Date.parse(point.recordedAt)) &&
    typeof point.accuracyMeters === "number" &&
    Number.isFinite(point.accuracyMeters) &&
    point.accuracyMeters >= 0 &&
    point.accuracyMeters <= movementQualityLimits.accuracyMeters &&
    point.source === "browser" &&
    typeof point.id === "string" &&
    typeof point.tripId === "string" &&
    typeof point.userId === "string" &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

export function loadLastBrowserLocation(userId: string): MovementPoint | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(getLastBrowserLocationKey(userId));
    const parsed = stored ? JSON.parse(stored) : null;
    return isStoredMovementPoint(parsed) && parsed.userId === userId ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveLastBrowserLocation(userId: string, point: MovementPoint) {
  if (typeof localStorage === "undefined") {
    return;
  }

  try {
    localStorage.setItem(getLastBrowserLocationKey(userId), JSON.stringify(point));
  } catch {
    // Location still works for this session when browser storage is unavailable.
  }
}

export function movementPointFromBrowserPosition(position: GeolocationPosition, tripId: string, userId: string): MovementPoint {
  return {
    id: `browser-current-${tripId}`,
    tripId,
    userId,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    recordedAt: new Date(position.timestamp || Date.now()).toISOString(),
    source: "browser",
  };
}
