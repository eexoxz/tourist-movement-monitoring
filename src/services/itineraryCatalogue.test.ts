import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { localeOptions } from "./i18n";
import { getDestinationState } from "./destinationState";
import { localizeDestinations } from "./destinationLocale";
import { prepareItineraryCatalogue, searchItineraryCatalogue } from "./itineraryCatalogue";

describe("indexed itinerary catalogue", () => {
  it("preserves the previous result ordering, suggestions and filters in every language", () => {
    for (const { value: locale } of localeOptions) {
      const places = localizeDestinations(initialData.destinations, locale);
      const originalOrder = places.map((place) => place.id);
      const suggestions = new Set([places[2].id, places[0].id]);
      const index = prepareItineraryCatalogue(places, locale, suggestions);
      for (const state of ["", "Penang", "Federal Territories"] as const) for (const query of ["", "  PaRK  ", "museum", places[0].name]) {
        const search = query.trim().toLocaleLowerCase(locale);
        const expected = places.filter((place) => (!state || getDestinationState(place) === state) && (!search || `${place.name} ${place.city} ${getDestinationState(place) ?? ""} ${place.description}`.toLocaleLowerCase(locale).includes(search)))
          .sort((a, b) => Number(suggestions.has(b.id)) - Number(suggestions.has(a.id)) || a.name.localeCompare(b.name, locale));
        expect(searchItineraryCatalogue(index, query, state, locale)).toEqual(expected);
      }
      expect(places.map((place) => place.id)).toEqual(originalOrder);
    }
  });
});
