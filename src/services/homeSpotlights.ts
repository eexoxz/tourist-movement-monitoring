import type { Destination, FestivalEvent } from "../types";
import { calendarDay } from "./useCalendarDay";
import { getUpcomingFestivals } from "./festivals";

export type HomeSpotlight = { id: string; destination: Destination; event?: FestivalEvent };
const featuredPlaceIds = ["kampung-baru-kl", "hin-bus-depot", "penang-hill"];

// Editorial picks are independent of GPS, personal history and sample crowd data.
export function buildHomeSpotlights(destinations: Destination[], events: FestivalEvent[] = [], today = calendarDay()): HomeSpotlight[] {
  const byId = new Map(destinations.filter((place) => place.imageUrl?.trim()).map((place) => [place.id, place]));
  const picks = featuredPlaceIds.flatMap((id) => byId.has(id) ? [byId.get(id)!] : []);
  for (const place of byId.values()) {
    if (picks.length >= 3) break;
    if (!picks.some((pick) => pick.id === place.id)) picks.push(place);
  }
  const slides: HomeSpotlight[] = picks.map((destination) => ({ id: destination.id, destination }));
  const event = getUpcomingFestivals(events, new Date(`${today}T00:00:00`)).find((candidate) => candidate.destinationIds.some((id) => byId.has(id)));
  if (event) slides.push({ id: `event:${event.id}`, destination: byId.get(event.destinationIds.find((id) => byId.has(id))!)!, event });
  return slides;
}
