import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { FestivalEvent } from "../types";
import { buildHomeSpotlights } from "./homeSpotlights";
import { spotlightText, type SpotlightKey } from "./spotlightCopy";
import { localeOptions } from "./i18n";
import { readFileSync } from "node:fs";
import { discoveryStates } from "../data/discoveryAreas";
import { getDestinationState } from "./destinationState";
import { getDiscoveryDestinations } from "./discovery";
import { distanceKm } from "./geo";
import type { Destination, DestinationDemand } from "../types";

const today = "2026-10-13";
const event: FestivalEvent = { id: "test-event", name: "Test festival", date: "2026-11-08", scope: "national", states: [], category: "cultural", description: "", destinationIds: [initialData.destinations[0].id] };
const release = JSON.parse(readFileSync(new URL("../../catalogue/locations-2026-10.json", import.meta.url), "utf8")) as { places: Destination[] };
const catalogue = [...initialData.destinations, ...release.places];
const demand = (destinationId: string, popularityScore: number): DestinationDemand => ({ destinationId, popularityScore, tier: "high", movementPointCount: 10, uniqueTouristCount: 4, recentPointCount: 10, approachSignalCount: 0, approachingTouristCount: 0 });

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
    for (const key of ["title", "previous", "next", "pause", "play", "slide", "national"] as SpotlightKey[]) {
      expect(spotlightText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(spotlightText(locale, key)).not.toBe(spotlightText("en", key));
    }
  });
});

describe("regional Home spotlights", () => {
  it.each(discoveryStates)("uses three %s slides and one clearly identified national feature", (state) => {
    const localIds = catalogue.filter((place) => getDestinationState(place) === state).map((place) => place.id);
    const slides = buildHomeSpotlights(catalogue, [], today, { localDestinationIds: localIds });
    expect(slides).toHaveLength(4);
    expect(slides.slice(0, 3).every((slide) => slide.scope === "local" && getDestinationState(slide.destination) === state)).toBe(true);
    expect(slides[3].scope).toBe("national");
    expect(new Set(slides.map((slide) => slide.destination.id)).size).toBe(4);
  });

  it("uses supplied movement activity for the national slot and editorial picks when activity is unavailable", () => {
    const selected = catalogue.find((place) => getDestinationState(place) === "Johor")!;
    const context = { localDestinationIds: catalogue.filter((place) => getDestinationState(place) === "Penang").map((place) => place.id) };
    expect(buildHomeSpotlights(catalogue, [], today, context).at(-1)?.destination.id).toBe("kampung-baru-kl");
    const slides = buildHomeSpotlights(catalogue, [], today, { ...context, activityDemand: [demand(selected.id, 80), demand("kampung-baru-kl", 20)] });
    expect(slides.at(-1)?.destination.id).toBe(selected.id);
    expect(slides.slice(0, 3).every((slide) => getDestinationState(slide.destination) === "Penang")).toBe(true);
  });

  it("prioritizes nearby GPS places without using old trip history as a location", () => {
    const user = { ...initialData.users[0], discoveryLocationMode: "current" as const };
    const point = { ...initialData.points[0], latitude: 5.4, longitude: 100.28 };
    const local = getDiscoveryDestinations(catalogue, user, point);
    const slides = buildHomeSpotlights(catalogue, [], today, { localDestinationIds: local.map((place) => place.id), referencePoint: point });
    const expected = [...local].sort((a, b) => distanceKm(point, a) - distanceKm(point, b)).slice(0, 3);
    expect(slides.slice(0, 3).map((slide) => slide.destination.id)).toEqual(expected.map((place) => place.id));
    expect(slides.slice(0, 3).every((slide) => distanceKm(point, slide.destination) <= 25)).toBe(true);
  });

  it("includes only events linked to the selected region, with their real location photo", () => {
    const local = catalogue.filter((place) => getDestinationState(place) === "Penang");
    const regional = { ...event, id: "regional", destinationIds: [local[0].id] };
    const context = { localDestinationIds: local.map((place) => place.id) };
    const slides = buildHomeSpotlights(catalogue, [event, regional], today, context);
    expect(slides).toHaveLength(4);
    expect(slides[2]).toMatchObject({ event: regional, destination: local[0], scope: "local" });
    expect(slides.some((slide) => slide.event?.id === event.id)).toBe(false);
    expect(new Set(slides.map((slide) => slide.destination.id)).size).toBe(4);
    expect(buildHomeSpotlights(catalogue, [{ ...regional, date: "2026-10-01" }], today, context).every((slide) => !slide.event)).toBe(true);
  });

  it("does not pad sparse regions or show hidden places and missing photos", () => {
    const local = catalogue.filter((place) => getDestinationState(place) === "Penang");
    expect(buildHomeSpotlights(catalogue, [], today, { localDestinationIds: [] })).toHaveLength(1);
    const excluded = [local[0].id, "kampung-baru-kl"];
    const slides = buildHomeSpotlights(catalogue.map((place) => place.id === local[1].id ? { ...place, imageUrl: "" } : place), [], today, { localDestinationIds: local.map((place) => place.id), excludedDestinationIds: excluded });
    expect(slides.every((slide) => !excluded.includes(slide.destination.id) && slide.destination.id !== local[1].id && slide.destination.imageUrl)).toBe(true);
  });
});
