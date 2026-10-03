import type { MovementPoint } from "../types";
import type { DestinationSpatialIndex } from "./destinationSpatialIndex";
import { filterQualityMovementPoints } from "./movementQuality";

const stopRadiusKm = 0.35;
const stopDwellMs = 3 * 60 * 1000;
const maximumReadingGapMs = 5 * 60 * 1000;

export function getRecordedStopIds(points: MovementPoint[], destinationIndex: DestinationSpatialIndex) {
  const stops = new Set<string>();
  const currentByTrip = new Map<string, { destinationId: string; startedAt: number; lastAt: number }>();
  for (const point of filterQualityMovementPoints(points)) {
    const nearest = destinationIndex.nearest(point, point.source === "demo" ? 1.2 : stopRadiusKm);
    if (point.source === "demo") {
      if (nearest) stops.add(nearest.destination.id);
      continue;
    }
    if (!nearest) {
      currentByTrip.delete(point.tripId);
      continue;
    }
    const timestamp = Date.parse(point.recordedAt);
    const current = currentByTrip.get(point.tripId);
    if (!current || current.destinationId !== nearest.destination.id || timestamp - current.lastAt > maximumReadingGapMs) {
      currentByTrip.set(point.tripId, { destinationId: nearest.destination.id, startedAt: timestamp, lastAt: timestamp });
    } else {
      current.lastAt = timestamp;
      if (timestamp - current.startedAt >= stopDwellMs) stops.add(nearest.destination.id);
    }
  }
  return stops;
}
