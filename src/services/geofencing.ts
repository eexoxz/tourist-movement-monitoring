import type { AppData, GeoFence, GeoFenceType, MovementPoint } from "../types";
import { distanceKm } from "./geo";

export type GeoFenceWarning = {
  geofence: GeoFence;
  distanceMeters: number;
  tone: "error" | "warning" | "info";
};

export type GeoFenceActivity = {
  geofence: GeoFence;
  pointCount: number;
  touristCount: number;
  latestRecordedAt?: string;
};

const toneByType: Record<GeoFenceType, GeoFenceWarning["tone"]> = {
  restricted: "error",
  dense: "warning",
  safe: "info",
};

export function getActiveGeofenceWarnings(point: Pick<MovementPoint, "latitude" | "longitude"> | null | undefined, geofences: GeoFence[]): GeoFenceWarning[] {
  if (!point) {
    return [];
  }

  return geofences
    .map((geofence) => ({
      geofence,
      distanceMeters: Math.round(distanceKm(point, geofence) * 1000),
      tone: toneByType[geofence.type],
    }))
    .filter((warning) => warning.distanceMeters <= warning.geofence.radiusMeters)
    .sort((a, b) => {
      const priority = { error: 0, warning: 1, info: 2 };
      return priority[a.tone] - priority[b.tone] || a.distanceMeters - b.distanceMeters;
    });
}

export function calculateGeofenceActivity(data: AppData): GeoFenceActivity[] {
  return data.geofences
    .map((geofence) => {
      const points = data.points.filter((point) => distanceKm(point, geofence) * 1000 <= geofence.radiusMeters);
      const latestRecordedAt = points.map((point) => point.recordedAt).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

      return {
        geofence,
        pointCount: points.length,
        touristCount: new Set(points.map((point) => point.userId).filter(Boolean)).size,
        latestRecordedAt,
      };
    })
    .sort((a, b) => b.pointCount - a.pointCount || a.geofence.name.localeCompare(b.geofence.name));
}
