import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { createItinerary, addItineraryStop } from "../services/itineraries";
import { cacheItineraries } from "../services/itineraryStorage";
import { localeOptions } from "../services/i18n";
import { itineraryText } from "../services/itineraryCopy";
import { ItineraryPage } from "./ItineraryPage";
import { ItineraryTimeField } from "./ItineraryTimeField";
import { itineraryUiKeys, itineraryUiText } from "../services/itineraryUiCopy";

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
    expect(html.match(/class="itinerary-plan-row"/g)).toHaveLength(1);
    expect(html).toContain(itineraryText(locale, "plans"));
    expect(html).not.toContain('class="itinerary-stop"');
    expect(html).not.toContain('max="720"');
    for (const key of itineraryUiKeys) expect(itineraryUiText(locale, key).trim()).not.toBe("");
  });
  it("keeps a large library bounded and provides search and page navigation", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    const user = initialData.users.find((item) => item.role === "tourist")!;
    cacheItineraries(user.id, Array.from({ length: 21 }, (_, i) => ({ plan: createItinerary(user.id, `Route ${i + 1}`), dirty: i % 2 === 0 })));
    const html = renderToStaticMarkup(createElement(ItineraryPage, { user, destinations: initialData.destinations, locale: "en", onBack: () => {}, onOpenPlace: () => {} }));
    expect(html.match(/class="itinerary-plan-row"/g)).toHaveLength(5);
    expect(html).toContain("Search itineraries");
    expect(html).toContain("Page 1 of 5");
    expect(html).not.toContain("Route 21");
  });
  it("retains precise times without an AM/PM popup and permits clearing an unset time", () => {
    const render = (value: string) => renderToStaticMarkup(createElement(ItineraryTimeField, { label: "Arrival time", value, locale: "en", invalid: false, onChange: () => {} }));
    const filled = render("00:07");
    expect(filled).toContain('value="00" selected=""');
    expect(filled).toContain('value="07" selected=""');
    expect(filled).toContain('value="59"');
    expect(filled).not.toContain('type="time"');
    expect(filled).toContain("24h");
    expect(render("")).toMatch(/aria-label="Arrival time: Minute"[^>]*disabled=""/);
  });
});
