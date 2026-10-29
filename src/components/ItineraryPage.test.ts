import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { createItinerary, addItineraryStop } from "../services/itineraries";
import { cacheItineraries } from "../services/itineraryStorage";
import { localeOptions } from "../services/i18n";
import { itineraryText } from "../services/itineraryCopy";
import { ItineraryPage } from "./ItineraryPage";

vi.mock("../services/firebaseClient", () => ({ isFirebaseConfigured: () => false, getFirebaseServices: () => null }));
afterEach(() => vi.unstubAllGlobals());
describe("itinerary editor presentation", () => {
  for (const { value: locale } of localeOptions) it(`shows saved plans before opening an editor in ${locale}`, () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    const user = initialData.users.find((item) => item.role === "tourist")!;
    const plan = addItineraryStop(createItinerary(user.id, "User-written title"), initialData.destinations[0], 1);
    cacheItineraries(user.id, [{ plan, dirty: true }]);
    const html = renderToStaticMarkup(createElement(ItineraryPage, { user, destinations: initialData.destinations, locale, onBack: () => {}, onOpenPlace: () => {} }));
    expect(html).toContain("User-written title");
    expect(html).toContain(itineraryText(locale, "title"));
    expect(html).toContain('class="itinerary-library"');
    expect(html.match(/class="itinerary-plan-card"/g)).toHaveLength(1);
    expect(html).toContain(itineraryText(locale, "plans"));
    expect(html).not.toContain('class="itinerary-stop"');
    expect(html).not.toContain('max="720"');
  });
});
