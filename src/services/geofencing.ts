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

type GeoFenceActivityAccumulator = {
  geofence: GeoFence;
  latestRecordedAt?: string;
  latestRecordedTime: number;
  pointCount: number;
  touristIds: Set<string>;
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
  const activity = data.geofences.map<GeoFenceActivityAccumulator>((geofence) => ({
    geofence,
    latestRecordedTime: 0,
    pointCount: 0,
    touristIds: new Set<string>(),
  }));

  data.points.forEach((point) => {
    activity.forEach((row) => {
      if (distanceKm(point, row.geofence) * 1000 > row.geofence.radiusMeters) {
        return;
      }

      row.pointCount += 1;
      if (point.userId) {
        row.touristIds.add(point.userId);
      }

      const recordedTime = new Date(point.recordedAt).getTime();
      if (recordedTime > row.latestRecordedTime) {
        row.latestRecordedTime = recordedTime;
        row.latestRecordedAt = point.recordedAt;
      }
    });
  });

  return activity
    .map((row) => ({
      geofence: row.geofence,
      pointCount: row.pointCount,
      touristCount: row.touristIds.size,
      latestRecordedAt: row.latestRecordedAt,
    }))
    .sort((a, b) => b.pointCount - a.pointCount || a.geofence.name.localeCompare(b.geofence.name));
}
