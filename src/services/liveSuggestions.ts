import type { Destination, DestinationCategory, DestinationDemand, MovementPoint, User } from "../types";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";

type LiveSuggestionInput = {
  point: Pick<MovementPoint, "latitude" | "longitude">;
  destinations: Destination[];
  demand: DestinationDemand[];
  user: User;
  excludeDestinationIds?: Set<string>;
};

export type LiveNearbySuggestion = {
  destination: Destination;
  distanceKm: number;
  reason: "nearby" | "preference" | "popular";
};

const demandTierScore: Record<DestinationDemand["tier"], number> = {
  high: 36,
  medium: 24,
  emerging: 16,
  low: 6,
};

function preferenceMatches(category: DestinationCategory, user: User) {
  return Boolean(user.travelPreferences?.includes(category));
}

function trackingRadius(user: User) {
  const radius = user.trackingSuggestionRadiusKm ?? 2;
  return Number.isFinite(radius) ? Math.min(5, Math.max(1, radius)) : 2;
}

function trackingMode(user: User) {
  return user.trackingSuggestionMode ?? "balanced";
}

export function getLiveNearbySuggestion({
  point,
  destinations,
  demand,
  user,
  excludeDestinationIds = new Set<string>(),
}: LiveSuggestionInput): LiveNearbySuggestion | null {
  const mode = trackingMode(user);
  if (mode === "off") {
    return null;
  }

  const demandByDestination = new Map(demand.map((row) => [row.destinationId, row]));
  const candidates = createDestinationSpatialIndex(destinations)
    .nearby(point, trackingRadius(user))
    .filter(({ destination }) => !excludeDestinationIds.has(destination.id));

  if (candidates.length === 0) {
    return null;
  }

  const ranked = candidates
    .map(({ destination, distance }) => {
      const demandRow = demandByDestination.get(destination.id);
      const preferenceScore = preferenceMatches(destination.category, user) ? 28 : 0;
      const proximityScore = Math.max(0, 30 - distance * 8);
      const popularityScore = demandRow ? demandTierScore[demandRow.tier] + Math.min(14, demandRow.popularityScore / 10) : 0;
      const score =
        mode === "nearby"
          ? proximityScore
          : mode === "popular"
            ? popularityScore * 1.4 + proximityScore * 0.5 + preferenceScore * 0.4
            : proximityScore + popularityScore + preferenceScore;

      const reason: LiveNearbySuggestion["reason"] = preferenceScore > 0 ? "preference" : popularityScore >= 24 ? "popular" : "nearby";

      return {
        destination,
        distance,
        score,
        reason,
      };
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance);

  const best = ranked[0];
  if (!best) {
    return null;
  }

  return {
    destination: best.destination,
    distanceKm: Number(best.distance.toFixed(1)),
    reason: best.reason,
  };
}
