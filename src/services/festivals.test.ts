import { describe, expect, it } from "vitest";
import { malaysiaFestivalEvents } from "../data/festivals";
import { destinations } from "../data/destinations";
import { formatFestivalDate, formatFestivalScope, formatFestivalStateSummaryLabel, getFestivalDestinationMatches, getFestivalPlanningSummary, getFestivalsForState, getUpcomingFestivals } from "./festivals";

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
    expect(getFestivalPlanningSummary(deepavali, destinations)).toContain("may become busier");
  });

  it("summarizes broad state coverage without long state lists", () => {
    const newYear = malaysiaFestivalEvents.find((candidate) => candidate.id === "new-year-2027")!;

    expect(formatFestivalScope(newYear)).toBe("All states except Johor, Kedah, Kelantan, Perlis, Terengganu");
    expect(formatFestivalStateSummaryLabel(newYear)).toBe("Available in most states");
  });

  it("keeps card scope labels short for selected states", () => {
    const keretapiSarong = malaysiaFestivalEvents.find((candidate) => candidate.id === "keretapi-sarong-2026")!;
    const sarawakDay = malaysiaFestivalEvents.find((candidate) => candidate.id === "sarawak-day-2027")!;

    expect(formatFestivalStateSummaryLabel(keretapiSarong)).toBe("Exclusive to selected states");
    expect(formatFestivalStateSummaryLabel(sarawakDay)).toBe("Exclusive to Sarawak");
  });

  it("keeps the calendar rolling from the current open date", () => {
    const events = getUpcomingFestivals(malaysiaFestivalEvents, new Date("2026-11-15T08:00:00"), 365);
    const eventIds = events.map((event) => event.id);
    const generatedMerdeka = events.find((event) => event.id === "merdeka-2027");

    expect(eventIds).not.toContain("skccm-kuching-2026");
    expect(eventIds).toContain("christmas-2026");
    expect(eventIds).toContain("merdeka-2027");
    expect(eventIds).toContain("malaysia-day-2027");
    expect(eventIds).toContain("deepavali-2027");
    expect(generatedMerdeka?.date).toBe("2027-08-31");
  });
});
