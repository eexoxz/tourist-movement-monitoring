import { describe, expect, it } from "vitest";
import { malaysiaFestivalEvents } from "../data/festivals";
import { destinations } from "../data/destinations";
import { formatFestivalCardScope, formatFestivalDate, formatFestivalScope, getFestivalDestinationMatches, getFestivalPlanningSummary, getFestivalsForState, getUpcomingFestivals } from "./festivals";

describe("festival planning service", () => {
  it("sorts upcoming Malaysia festival signals by date", () => {
    const events = getUpcomingFestivals(malaysiaFestivalEvents, new Date("2026-08-29T08:00:00"), 365);
    const eventIds = events.map((event) => event.id);

    expect(eventIds[0]).toBe("maha-2026");
    expect(eventIds).toContain("merdeka-2026");
    expect(eventIds).toContain("maulidur-rasul-2027");
    expect(eventIds).not.toContain("merdeka-2027");
  });

  it("formats multi-day events and resolves related destinations", () => {
    const event = malaysiaFestivalEvents.find((candidate) => candidate.id === "gawai-2027")!;
    const matches = getFestivalDestinationMatches(event, destinations);

    expect(formatFestivalDate(event)).toBe("1 Jun 2027 to 2 Jun 2027");
    expect(matches.map((destination) => destination.id)).toContain("sarawak-cultural-village");
  });

  it("filters festival signals by state and summarizes broad state coverage", () => {
    const deepavali = malaysiaFestivalEvents.find((candidate) => candidate.id === "deepavali-2026")!;
    const sarawakEvents = getFestivalsForState(malaysiaFestivalEvents, "Sarawak");

    expect(sarawakEvents.map((event) => event.id)).not.toContain("deepavali-2026");
    expect(formatFestivalScope(deepavali)).toBe("All states except Sarawak");
    expect(getFestivalPlanningSummary(deepavali, destinations)).toContain("linked place");
  });

  it("summarizes broad state coverage without long state lists", () => {
    const newYear = malaysiaFestivalEvents.find((candidate) => candidate.id === "new-year-2027")!;

    expect(formatFestivalScope(newYear)).toBe("All states except Johor, Kedah, Kelantan, Perlis, Terengganu");
    expect(formatFestivalCardScope(newYear)).toBe("Most states");
  });

  it("keeps card scope labels short for selected states", () => {
    const keretapiSarong = malaysiaFestivalEvents.find((candidate) => candidate.id === "keretapi-sarong-2026")!;
    const sarawakDay = malaysiaFestivalEvents.find((candidate) => candidate.id === "sarawak-day-2027")!;

    expect(formatFestivalCardScope(keretapiSarong)).toBe("Selected states");
    expect(formatFestivalCardScope(sarawakDay)).toBe("Sarawak");
  });
});
