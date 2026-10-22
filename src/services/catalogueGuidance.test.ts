import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { Destination } from "../types";
import type { Locale } from "./i18n";
import { catalogueGuidance } from "./catalogueGuidance";
import { localizeDestination } from "./destinationLocale";

const locales: Locale[] = ["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"];
const venue: Destination = {
  ...initialData.destinations[0],
  visitorGuidance: ["boat", "trail", "worship", "residential", "booking", "market", "wildlife", "beach"],
};

describe("catalogue visitor guidance", () => {
  it.each(locales)("provides all practical guidance in %s", (locale) => {
    const result = catalogueGuidance(venue, locale);
    expect(result).toHaveLength(8);
    expect(new Set(result).size).toBe(8);
    expect(result.every((tip) => tip.length > 10)).toBe(true);
    if (locale !== "en") {
      const localized = localizeDestination(venue, locale);
      expect(localized.visitTips?.slice(0, 8)).toEqual(result);
      expect(result.every((tip) => !catalogueGuidance(venue, "en").includes(tip))).toBe(true);
      expect(localized.visitorGuidance).toBe(venue.visitorGuidance);
    }
  });

  it("does not duplicate the English tips stored in the published catalogue", () => {
    const source = { ...venue, visitTips: catalogueGuidance(venue, "en") };
    expect(localizeDestination(source, "en")).toBe(source);
    expect(source.visitTips).toHaveLength(8);
  });

  it("allows older venues without guidance codes", () => {
    expect(catalogueGuidance(initialData.destinations[0], "en")).toEqual([]);
  });
});
