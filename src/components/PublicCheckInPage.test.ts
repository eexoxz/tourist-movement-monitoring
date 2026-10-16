import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { Locale } from "../services/i18n";
import { checkInSyncText } from "../services/checkInSyncCopy";
import { PublicCheckInPage } from "./PublicCheckInPage";

describe("standalone check-in navigation", () => {
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
