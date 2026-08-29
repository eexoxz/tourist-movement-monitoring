import { describe, expect, it } from "vitest";
import { malaysiaFestivalEvents } from "../data/festivals";
import { destinations } from "../data/destinations";
import { formatFestivalDate, formatFestivalScope, getFestivalDestinationMatches, getFestivalPlanningSummary, getFestivalsForState, getUpcomingFestivals } from "./festivals";

describe("festival planning service", () => {
  it("sorts upcoming Malaysia festival signals by date", () => {
    const events = getUpcomingFestivals(malaysiaFestivalEvents, new Date("2026-08-29T08:00:00"), 120);

    expect(events.map((event) => event.id)).toEqual(["merdeka-2026", "malaysia-day-2026", "deepavali-2026", "christmas-2026"]);
  });

  it("formats multi-day events and resolves related destinations", () => {
    const event = malaysiaFestivalEvents.find((candidate) => candidate.id === "gawai-2026")!;
    const matches = getFestivalDestinationMatches(event, destinations);

    expect(formatFestivalDate(event)).toBe("1 Jun 2026 to 2 Jun 2026");
    expect(matches.map((destination) => destination.id)).toContain("sarawak-cultural-village");
  });

  it("filters festival signals by state and summarizes broad state coverage", () => {
    const deepavali = malaysiaFestivalEvents.find((candidate) => candidate.id === "deepavali-2026")!;
    const sarawakEvents = getFestivalsForState(malaysiaFestivalEvents, "Sarawak");

    expect(sarawakEvents.map((event) => event.id)).not.toContain("deepavali-2026");
    expect(formatFestivalScope(deepavali)).toBe("All states except Sarawak");
    expect(getFestivalPlanningSummary(deepavali, destinations)).toContain("linked place");
  });
});
