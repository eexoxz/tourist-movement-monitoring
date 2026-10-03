import type { AppData, Destination, DestinationActivitySummary, DestinationDemand, User } from "../types";
import { calculateDestinationDemand } from "./analytics";

const summaryMaxAgeMs = 24 * 60 * 60 * 1000;
const summaryTiers = new Set(["low", "emerging", "medium", "high"]);

export function isFreshActivitySummary(summary: DestinationActivitySummary | undefined, now = Date.now()): summary is DestinationActivitySummary {
  if (!summary || summary.version !== 1 || summary.windowDays !== 7 || !summaryTiers.has(summary.tier) || !Number.isFinite(summary.popularityScore) || summary.popularityScore < 0 || summary.popularityScore > 100) return false;
  const age = now - Date.parse(summary.updatedAt);
  return Number.isFinite(age) && age >= 0 && age <= summaryMaxAgeMs;
}

export function usesSampleActivity(user: User) {
  return user.sampleActivityEnabled ?? !user.authUid;
}

export function buildDestinationActivitySummaries(data: AppData, now = Date.now(), source: "browser" | "demo" = "browser"): Destination[] {
  const touristIds = new Set(data.users.filter((user) => user.role === "tourist").map((user) => user.id));
  const tripOwners = new Map(data.trips.filter((trip) => touristIds.has(trip.userId)).map((trip) => [trip.id, trip.userId]));
  const recentData = { ...data, points: data.points.filter((point) => tripOwners.has(point.tripId) && (!point.userId || point.userId === tripOwners.get(point.tripId)) && point.source === source && Date.parse(point.recordedAt) >= now - 7 * 24 * 60 * 60 * 1000 && Date.parse(point.recordedAt) <= now) };
  const demand = new Map(calculateDestinationDemand(recentData, { includeDemo: source === "demo", now }).map((row) => [row.destinationId, row]));
  return data.destinations.map((destination) => {
    const row = demand.get(destination.id);
    const enoughVisitors = row && row.uniqueTouristCount >= 3;
    return {
      ...destination,
      // Publish only an activity band: no identity, coordinates, routes or exact visitor counts.
      [source === "browser" ? "activitySummary" : "demoActivitySummary"]: {
        version: 1,
        windowDays: 7,
        updatedAt: new Date(now).toISOString(),
        popularityScore: enoughVisitors ? Math.round(row.popularityScore / 20) * 20 : 0,
        tier: enoughVisitors ? row.tier : "low",
      },
    };
  });
}

export function getTouristDestinationDemand(data: AppData, user: User, now = Date.now()): DestinationDemand[] {
  const sample = usesSampleActivity(user);
  const localDemand = calculateDestinationDemand({ ...data, points: data.points.filter((point) => point.source === (sample ? "demo" : "browser")) }, { includeDemo: sample, now });
  const summaryById = new Map(data.destinations.map((destination) => [destination.id, sample ? destination.demoActivitySummary : destination.activitySummary]));
  return localDemand.map((row) => {
    const summary = summaryById.get(row.destinationId);
    const freshSummary = isFreshActivitySummary(summary, now) ? summary : undefined;
    return { ...row, popularityScore: freshSummary?.popularityScore ?? (sample ? row.popularityScore : 0), tier: freshSummary?.tier ?? (sample ? row.tier : "low") };
  }).sort((a, b) => b.popularityScore - a.popularityScore);
}
