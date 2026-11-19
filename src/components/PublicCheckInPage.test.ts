import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { Locale } from "../services/i18n";
import { checkInSyncText } from "../services/checkInSyncCopy";
import { localizeDestination } from "../services/destinationLocale";
import { QrCheckInPanel } from "./QrCheckInPanel";
import { PublicCheckInPage } from "./PublicCheckInPage";

describe("standalone check-in navigation", () => {
  it("groups both city-based and state-based records under a state heading", () => {
    const sample = initialData.destinations[0];
    const cityPlace = { ...sample, id: "city-place", name: "City Place", city: "George Town", state: undefined };
    const statePlace = { ...sample, id: "state-place", name: "State Place", city: "Penang", state: undefined };
    const options = renderToStaticMarkup(createElement(QrCheckInPanel, {
      destinations: [cityPlace, statePlace], selectedDestination: cityPlace,
      onConfirm: () => {}, onDestinationChange: () => {},
    }));
    expect(options).toMatch(/<optgroup label="Penang"><option value="city-place"[^>]*>City Place<\/option><option value="state-place"[^>]*>State Place<\/option><\/optgroup>/);
    const localized = localizeDestination(cityPlace, "zh");
    expect(localized.state).toBe("Penang");
    const confirmation = renderToStaticMarkup(createElement(PublicCheckInPage, {
      destination: cityPlace, locale: "en", passId: "MYP-TEST", passVerified: true,
      syncStatus: "Loaded from Firebase Firestore", onConfirm: () => ({ tone: "success" as const, title: "", message: "" }),
      onLocaleChange: () => {},
    }));
    expect(confirmation).toContain("<dt>State</dt><dd>Penang</dd>");
  });

  for (const locale of ["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"] as Locale[]) it(`has an active app return link before confirming in ${locale}`, () => {
    const html = renderToStaticMarkup(createElement(PublicCheckInPage, {
      destination: initialData.destinations[0], locale, passId: "MYP-TEST", passVerified: true,
      syncStatus: "Loaded from Firebase Firestore", onConfirm: async () => ({ tone: "success" as const, title: "", message: "" }), onLocaleChange: () => {},
    }));
    expect(html).toContain('href="/app/home"');
    expect(html).toContain(checkInSyncText(locale, "back").replace(/'/g, "&#x27;"));
    expect(html).not.toContain("<button class=\"secondary-action wide\" type=\"button\" disabled");
  });
});
