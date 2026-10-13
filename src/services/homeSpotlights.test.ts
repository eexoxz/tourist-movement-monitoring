import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { FestivalEvent } from "../types";
import { buildHomeSpotlights } from "./homeSpotlights";
import { spotlightText, type SpotlightKey } from "./spotlightCopy";
import { localeOptions } from "./i18n";

const today = "2026-10-13";
const event: FestivalEvent = { id: "test-event", name: "Test festival", date: "2026-11-08", scope: "national", states: [], category: "cultural", description: "", destinationIds: [initialData.destinations[0].id] };

describe("nationwide Home spotlights", () => {
  it("uses three distinct real catalogue places without personal or crowd data", () => {
    const slides = buildHomeSpotlights(initialData.destinations, [], today);
    expect(slides.map((slide) => slide.id)).toEqual(["kampung-baru-kl", "hin-bus-depot", "penang-hill"]);
    expect(slides.every((slide) => slide.destination.imageUrl)).toBe(true);
    expect(buildHomeSpotlights([...initialData.destinations].reverse(), [], today)).toEqual(slides);
  });
  it("fills missing editorial picks, skipping duplicate IDs and missing photos", () => {
    const places = initialData.destinations.slice(0, 4);
    const slides = buildHomeSpotlights([{ ...places[0], imageUrl: "" }, ...places.slice(1), places[1]], [], today);
    expect(slides).toHaveLength(3);
    expect(new Set(slides.map((slide) => slide.id)).size).toBe(3);
    expect(buildHomeSpotlights([], [], today)).toEqual([]);
    expect(buildHomeSpotlights([places[0]], [], today)).toHaveLength(1);
  });
  it("includes the nearest upcoming or ongoing event with an actual linked-place photo", () => {
    const later = { ...event, id: "later", date: "2026-12-01" };
    const slides = buildHomeSpotlights(initialData.destinations, [later, event], today);
    expect(slides[3]).toMatchObject({ event, destination: initialData.destinations[0] });
    expect(buildHomeSpotlights(initialData.destinations, [{ ...event, date: "2026-10-12", endDate: "2026-10-14" }], today)).toHaveLength(4);
  });
  it("removes expired, far-future and unlinked events rather than inventing promotions", () => {
    for (const invalid of [{ ...event, date: "2026-10-12" }, { ...event, date: "2028-01-01" }, { ...event, destinationIds: ["not-in-catalogue"] }]) {
      expect(buildHomeSpotlights(initialData.destinations, [invalid], today)).toHaveLength(3);
    }
    expect(buildHomeSpotlights(initialData.destinations, [event], "2026-11-09")).toHaveLength(3);
  });
  for (const { value: locale } of localeOptions) it(`has translated carousel controls in ${locale}`, () => {
    for (const key of ["title", "previous", "next", "pause", "play", "slide"] as SpotlightKey[]) {
      expect(spotlightText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(spotlightText(locale, key)).not.toBe(spotlightText("en", key));
    }
  });
});
