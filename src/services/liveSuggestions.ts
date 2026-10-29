import type { Destination, DestinationCategory, DestinationDemand, MovementPoint, User } from "../types";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { distanceKm } from "./geo";
import { getMovementQualityIssue } from "./movementQuality";
import { gpsStaleAfterMs } from "./trackingHealth";

type LiveSuggestionInput = {
  point: Pick<MovementPoint, "latitude" | "longitude">;
  destinations: Destination[];
  demand: DestinationDemand[];
  user: User;
  excludeDestinationIds?: Set<string>;
  onlyDestinationId?: string;
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

// GPS readings change much more often than the catalogue or activity bands.
export function createLiveNearbySuggestionSelector() {
  let places: Destination[] | undefined;
  let activity: DestinationDemand[] | undefined;
  let index: ReturnType<typeof createDestinationSpatialIndex>;
  let byId: Map<string, Destination>;
  let demandByDestination: Map<string, DestinationDemand>;
  return ({ point, destinations, demand, user, excludeDestinationIds, onlyDestinationId }: LiveSuggestionInput): LiveNearbySuggestion | null => {
    const mode = trackingMode(user);
    if (mode === "off" || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) return null;
    if (places !== destinations) {
      places = destinations;
      index = createDestinationSpatialIndex(destinations);
      byId = new Map(destinations.map((place) => [place.id, place]));
    }
    if (activity !== demand) {
      activity = demand;
      demandByDestination = new Map(demand.map((row) => [row.destinationId, row]));
    }
    const hidden = new Set(user.hiddenDestinationIds ?? []);
    const radius = trackingRadius(user);
    let best: { destination: Destination; distance: number; score: number; reason: LiveNearbySuggestion["reason"] } | undefined;
    const consider = (destination: Destination, distance: number) => {
      if (excludeDestinationIds?.has(destination.id) || hidden.has(destination.id) || distance > radius) return;
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

      if (!best || score > best.score || (score === best.score && distance < best.distance)) best = { destination, distance, score, reason };
    };
    if (onlyDestinationId) {
      const destination = byId.get(onlyDestinationId);
      if (destination) consider(destination, distanceKm(point, destination));
    } else index.forEachNearby(point, radius, consider);
    return best ? { destination: best.destination, distanceKm: Number(best.distance.toFixed(1)), reason: best.reason } : null;
  };
}

export const getLiveNearbySuggestion = (input: LiveSuggestionInput) => createLiveNearbySuggestionSelector()(input);

export type NearbyTrackingInput = Omit<LiveSuggestionInput, "point" | "excludeDestinationIds" | "onlyDestinationId"> & {
  point?: MovementPoint;
  activeTripId?: string;
  listening: boolean;
  consent: boolean;
  attention: boolean;
};
export const nearbySuggestionCooldownMs = 2 * 60 * 1000;

export function createNearbySuggestionTracker() {
  const select = createLiveNearbySuggestionSelector();
  let context = "";
  const shown = new Set<string>();
  let lastShownAt = -Infinity;
  let current: LiveNearbySuggestion | null = null;
  return {
    dismiss() { current = null; },
    update(input: NearbyTrackingInput, now = Date.now(), visible = true): LiveNearbySuggestion | null {
      const key = JSON.stringify([input.user.id, input.activeTripId ?? "browse"]);
      if (key !== context) { context = key; shown.clear(); lastShownAt = -Infinity; current = null; }
      const point = input.point;
      const allowed = input.consent && !input.attention && trackingMode(input.user) !== "off" && (input.activeTripId ? input.listening && point?.tripId === input.activeTripId : input.user.discoveryLocationMode !== "area");
      if (!allowed || !point || point.source !== "browser" || point.userId !== input.user.id || getMovementQualityIssue(point, undefined, now, true) || now - Date.parse(point.recordedAt) > gpsStaleAfterMs) { current = null; return null; }
      // Backgrounding is not dismissal; revalidate the same card when the app returns.
      if (!visible) return null;
      if (current) {
        const next = select({ ...input, point, onlyDestinationId: current.destination.id });
        if (next && next.destination === current.destination && next.distanceKm === current.distanceKm && next.reason === current.reason) return current;
        current = next;
        if (current) return current;
      }
      if (now - lastShownAt < nearbySuggestionCooldownMs) return null;
      current = select({ ...input, point, excludeDestinationIds: shown });
      if (current) { shown.add(current.destination.id); lastShownAt = now; }
      return current;
    },
  };
}
