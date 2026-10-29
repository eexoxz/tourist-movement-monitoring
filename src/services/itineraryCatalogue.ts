import type { Destination, MalaysianState } from "../types";
import type { Locale } from "./i18n";
import { getDestinationState } from "./destinationState";

// Sort and normalize once per catalogue/locale, rather than on every search keystroke.
export function prepareItineraryCatalogue(destinations: Destination[], locale: Locale, suggestions: ReadonlySet<string>) {
  const compare = new Intl.Collator(locale).compare;
  return destinations.map((place) => {
    const state = getDestinationState(place);
    return { place, state, search: `${place.name} ${place.city} ${state ?? ""} ${place.description}`.toLocaleLowerCase(locale) };
  }).sort((a, b) => Number(suggestions.has(b.place.id)) - Number(suggestions.has(a.place.id)) || compare(a.place.name, b.place.name));
}

export function searchItineraryCatalogue(index: ReturnType<typeof prepareItineraryCatalogue>, query: string, state: MalaysianState | "", locale: Locale) {
  const search = query.trim().toLocaleLowerCase(locale);
  return index.filter((row) => (!state || row.state === state) && (!search || row.search.includes(search))).map((row) => row.place);
}
