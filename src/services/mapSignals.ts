import type { Destination, DestinationDemand, MovementPoint } from "../types";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { filterQualityMovementPoints, getMovementQualityIssue, movementQualityLimits } from "./movementQuality";

export type DestinationSignal = {
  nearbyPointCount: number;
  uniqueTouristCount: number;
  latestRecordedAt?: string;
  distanceFromActiveKm?: number;
  tier: "high" | "medium" | "emerging" | "low";
  activityScore?: number;
};

type MutableDestinationSignal = {
  nearbyPointCount: number;
  touristIds: Set<string>;
  latestRecordedAt?: string;
  latestRecordedTime: number;
};

const nearbyRadiusKm = 1.2;

export function emptyDestinationSignal(activePoint?: MovementPoint, destination?: Destination): DestinationSignal {
  return {
    nearbyPointCount: 0,
    uniqueTouristCount: 0,
    distanceFromActiveKm: activePoint && destination ? distanceKm(activePoint, destination) : undefined,
    tier: "low",
  };
}

function getTier(nearbyPointCount: number, uniqueTouristCount: number): DestinationSignal["tier"] {
  if (nearbyPointCount >= 12 || uniqueTouristCount >= 5) {
    return "high";
  }

  if (nearbyPointCount >= 6 || uniqueTouristCount >= 3) {
    return "medium";
  }

  if (nearbyPointCount >= 2 || uniqueTouristCount >= 1) {
    return "emerging";
  }

  return "low";
}

export function createDestinationSignalCalculator() {
  let previousDestinations: Destination[] | undefined;
  let previousPoints: MovementPoint[] = [];
  let index: ReturnType<typeof createDestinationSpatialIndex>;
  let signals = new Map<string, MutableDestinationSignal>();
  let previousByTrip = new Map<string, MovementPoint>();
  let latestTimestamp = -Infinity, expiresAt = Infinity, calculatedAt = -Infinity;
  const accumulate = (point: MovementPoint) => {
    index.forEachNearby(point, nearbyRadiusKm, (destination) => {
      const signal = signals.get(destination.id)!;
      signal.nearbyPointCount++;
      signal.touristIds.add(point.userId || point.tripId);
      const time = Date.parse(point.recordedAt);
      if (time > signal.latestRecordedTime) { signal.latestRecordedTime = time; signal.latestRecordedAt = point.recordedAt; }
    });
    if (point.source === "browser") previousByTrip.set(point.tripId, point);
  };
  return (destinations: Destination[], points: MovementPoint[], activePoint?: MovementPoint, activityDemand?: DestinationDemand[], now = Date.now()) => {
    let appended = previousDestinations === destinations && now >= calculatedAt && now < expiresAt && previousPoints.length <= points.length
      && previousPoints.every((point, position) => point === points[position]);
    let tailTimestamp = latestTimestamp;
    if (appended) for (let i = previousPoints.length; i < points.length; i++) {
      const time = Date.parse(points[i].recordedAt);
      if (Number.isFinite(time) && time < tailTimestamp) { appended = false; break; }
      if (Number.isFinite(time)) tailTimestamp = time;
    }
    const start = appended ? previousPoints.length : 0;
    if (!appended) {
      if (previousDestinations !== destinations) index = createDestinationSpatialIndex(destinations);
      signals = new Map(destinations.map((destination) => [destination.id, { nearbyPointCount: 0, touristIds: new Set<string>(), latestRecordedTime: 0 }]));
      previousByTrip = new Map(); latestTimestamp = -Infinity; expiresAt = Infinity;
      filterQualityMovementPoints(points, now).forEach(accumulate);
    }
    for (let i = start; i < points.length; i++) {
      const point = points[i], time = Date.parse(point.recordedAt);
      if (Number.isFinite(time)) latestTimestamp = Math.max(latestTimestamp, time);
      if (point.source === "browser" && time > now + movementQualityLimits.clockToleranceMs) expiresAt = Math.min(expiresAt, time - movementQualityLimits.clockToleranceMs);
      if (appended && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180 && !getMovementQualityIssue(point, previousByTrip.get(point.tripId), now)) accumulate(point);
    }
    previousDestinations = destinations; previousPoints = points; calculatedAt = now;
    const demandById = new Map(activityDemand?.map((row) => [row.destinationId, row]) ?? []);
    return new Map(destinations.map((destination) => {
      const signal = signals.get(destination.id)!;
      return [destination.id, {
        nearbyPointCount: signal.nearbyPointCount, uniqueTouristCount: signal.touristIds.size,
        latestRecordedAt: signal.latestRecordedAt,
        distanceFromActiveKm: activePoint ? distanceKm(activePoint, destination) : undefined,
        tier: demandById.get(destination.id)?.tier ?? getTier(signal.nearbyPointCount, signal.touristIds.size),
        activityScore: demandById.get(destination.id)?.popularityScore,
      }];
    }));
  };
}

export function calculateDestinationSignals(destinations: Destination[], points: MovementPoint[], activePoint?: MovementPoint, activityDemand?: DestinationDemand[]) {
  return createDestinationSignalCalculator()(destinations, points, activePoint, activityDemand);
}
