import type { Destination, DestinationDemand, FestivalEvent, MovementPoint } from "../types";
import { calendarDay } from "./useCalendarDay";
import { getUpcomingFestivals } from "./festivals";
import { distanceKm } from "./geo";

export type HomeSpotlight = { id: string; destination: Destination; event?: FestivalEvent; scope?: "local" | "national" };
export type HomeSpotlightContext = {
  localDestinationIds?: readonly string[];
  referencePoint?: Pick<MovementPoint, "latitude" | "longitude">;
  activityDemand?: DestinationDemand[];
  excludedDestinationIds?: readonly string[];
};
const featuredPlaceIds = ["kampung-baru-kl", "hin-bus-depot", "penang-hill"];

export function buildHomeSpotlights(destinations: Destination[], events: FestivalEvent[] = [], today = calendarDay(), context: HomeSpotlightContext = {}): HomeSpotlight[] {
  const excluded = new Set(context.excludedDestinationIds);
  const byId = new Map(destinations.filter((place) => place.imageUrl?.trim() && !excluded.has(place.id)).map((place) => [place.id, place]));
  const upcoming = getUpcomingFestivals(events, new Date(`${today}T00:00:00`));

  if (context.localDestinationIds !== undefined) {
    const scores = new Map(context.activityDemand?.map((row) => [row.destinationId, Number.isFinite(row.popularityScore) ? row.popularityScore : 0]));
    const editorialRank = (id: string) => { const rank = featuredPlaceIds.indexOf(id); return rank < 0 ? featuredPlaceIds.length : rank; };
    const rank = (a: Destination, b: Destination) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || editorialRank(a.id) - editorialRank(b.id) || a.id.localeCompare(b.id);
    const national = [...byId.values()].sort(rank)[0];
    const localIds = new Set(context.localDestinationIds);
    const local = [...byId.values()].filter((place) => localIds.has(place.id) && place.id !== national?.id);
    const distances = new Map(local.map((place) => [place.id, context.referencePoint ? distanceKm(context.referencePoint, place) : 0]));
    local.sort((a, b) => distances.get(a.id)! - distances.get(b.id)! || rank(a, b));
    const event = upcoming.find((candidate) => candidate.destinationIds.some((id) => localIds.has(id) && byId.has(id) && id !== national?.id));
    const eventPlace = event ? byId.get(event.destinationIds.find((id) => localIds.has(id) && byId.has(id) && id !== national?.id)!) : undefined;
    const picks = local.filter((place) => place.id !== eventPlace?.id).slice(0, event ? 2 : 3);
    const slides: HomeSpotlight[] = picks.map((destination) => ({ id: destination.id, destination, scope: "local" }));
    if (event && eventPlace) slides.push({ id: `event:${event.id}`, destination: eventPlace, event, scope: "local" });
    if (national) slides.push({ id: national.id, destination: national, scope: "national" });
    // Never pad a sparse region with unrelated places disguised as nearby suggestions.
    return slides;
  }

  // Without a chosen state or usable GPS, retain honest nationwide editorial suggestions.
  const picks = featuredPlaceIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
  for (const place of byId.values()) {
    if (picks.length >= 3) break;
    if (!picks.some((pick) => pick.id === place.id)) picks.push(place);
  }
  const slides: HomeSpotlight[] = picks.map((destination) => ({ id: destination.id, destination }));
  const event = upcoming.find((candidate) => candidate.destinationIds.some((id) => byId.has(id)));
  if (event) slides.push({ id: `event:${event.id}`, destination: byId.get(event.destinationIds.find((id) => byId.has(id))!)!, event });
  return slides;
}
