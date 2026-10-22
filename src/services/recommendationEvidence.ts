import type { AppData, MovementPoint } from "../types";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { getRecordedStopIds } from "./stopEvidence";

type RecommendationEvidence = { visited: ReadonlySet<string>; latestPoint?: MovementPoint };

function prepareEvidence(data: AppData) {
  const trips = new Map(data.trips.map((trip) => [trip.id, trip]));
  const completedPoints = new Map<string, MovementPoint[]>();
  const latestPoints = new Map<string, MovementPoint>();
  const checkedIn = new Map<string, Set<string>>();
  const destinationIndex = createDestinationSpatialIndex(data.destinations);
  const results = new Map<string, RecommendationEvidence>();

  for (const point of data.points) {
    const trip = trips.get(point.tripId);
    if (!trip) continue;
    const latest = latestPoints.get(trip.userId);
    if (!latest || Date.parse(point.recordedAt) > Date.parse(latest.recordedAt)) latestPoints.set(trip.userId, point);
    if (trip.status !== "completed") continue;
    const points = completedPoints.get(trip.userId) ?? [];
    points.push(point);
    completedPoints.set(trip.userId, points);
  }
  for (const checkIn of data.checkIns) {
    if (!checkIn.destinationId) continue;
    const ids = checkedIn.get(checkIn.userId) ?? new Set<string>();
    ids.add(checkIn.destinationId);
    checkedIn.set(checkIn.userId, ids);
  }

  return (userId: string) => {
    let evidence = results.get(userId);
    if (!evidence) {
      const visited = getRecordedStopIds(completedPoints.get(userId) ?? [], destinationIndex);
      checkedIn.get(userId)?.forEach((id) => visited.add(id));
      evidence = { visited, latestPoint: latestPoints.get(userId) };
      results.set(userId, evidence);
    }
    return evidence;
  };
}

let cache: {
  trips: AppData["trips"];
  points: AppData["points"];
  checkIns: AppData["checkIns"];
  destinations: AppData["destinations"];
  computedAt: number;
  select: ReturnType<typeof prepareEvidence>;
} | undefined;

export function getRecommendationEvidence(data: AppData, userId: string): RecommendationEvidence {
  const now = Date.now();
  // Bound both retained history and time-sensitive GPS quality checks to one short-lived index.
  if (!cache || cache.trips !== data.trips || cache.points !== data.points || cache.checkIns !== data.checkIns || cache.destinations !== data.destinations || now < cache.computedAt || now - cache.computedAt >= 5000) {
    cache = { trips: data.trips, points: data.points, checkIns: data.checkIns, destinations: data.destinations, computedAt: now, select: prepareEvidence(data) };
  }
  return cache.select(userId);
}
