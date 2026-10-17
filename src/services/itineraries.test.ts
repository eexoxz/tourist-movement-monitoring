import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { addItineraryStop, createItinerary, itineraryDayDate, moveItineraryStop, reconcileItineraries, validItinerary, validPlanDate } from "./itineraries";
import { itineraryCopyKeys, itineraryText } from "./itineraryCopy";
import { localeOptions } from "./i18n";
import { travelText } from "./travelExperienceCopy";

const place = initialData.destinations[0];
const second = initialData.destinations[1];
const make = () => createItinerary("alice", "A trip", "2026-10-17T00:00:00Z");

describe("editable itinerary domain", () => {
  it("creates a valid independent plan without creating movement or check-ins", () => {
    const original = structuredClone(initialData);
    expect(validItinerary(make())).toBe(true);
    expect(initialData).toEqual(original);
    expect(make().revision).toBe(0);
  });
  it("adds catalogue places with bounded durations, not duplicates on the same day", () => {
    const plan = addItineraryStop({ ...make(), days: 2 }, place, 1);
    expect(plan.stops[0].minutes).toBe(place.averageVisitMinutes);
    expect(addItineraryStop(plan, place, 1)).toBe(plan);
    expect(addItineraryStop(plan, place, 2).stops).toHaveLength(2);
    expect(addItineraryStop(plan, second, 3)).toBe(plan);
    expect(addItineraryStop(make(), { ...place, averageVisitMinutes: 10000 }, 1).stops[0].minutes).toBe(720);
  });
  it("reorders only within the same day and respects both ends", () => {
    const plan = addItineraryStop(addItineraryStop({ ...make(), days: 2 }, place, 1), second, 1);
    const moved = moveItineraryStop(plan, plan.stops[0].id, 1);
    expect(moved.stops.map((stop) => stop.destinationId)).toEqual([second.id, place.id]);
    expect(moveItineraryStop(plan, plan.stops[0].id, -1)).toBe(plan);
    expect(moveItineraryStop(plan, "missing", 1)).toBe(plan);
    const split = { ...plan, stops: [plan.stops[0], { ...plan.stops[1], day: 2 }] };
    expect(moveItineraryStop(split, plan.stops[0].id, 1)).toBe(split);
  });
  it("rejects corrupt dates, impossible durations, duplicate IDs and out-of-range days", () => {
    const plan = addItineraryStop(make(), place, 1);
    for (const patch of [{ days: 0 }, { days: 15 }, { revision: -1 }, { startDate: "2026-02-30" }, { stops: [{ ...plan.stops[0], day: 2 }] }, { stops: [{ ...plan.stops[0], minutes: 0 }] }, { stops: [plan.stops[0], plan.stops[0]] }, { notes: "x".repeat(1001) }, { stops: [null] }]) expect(validItinerary({ ...plan, ...patch })).toBe(false);
  });
  it("enforces the 40-stop bound and permits empty days and local title drafts", () => {
    let plan = make();
    for (let i = 0; i < 40; i++) plan = addItineraryStop(plan, { ...place, id: `place-${i}` }, 1);
    expect(validItinerary({ ...plan, title: "" })).toBe(true);
    expect(addItineraryStop(plan, second, 1)).toBe(plan);
  });
  it("handles leap days and month/year rollover without local timezone drift", () => {
    expect(validPlanDate("2028-02-29")).toBe(true);
    expect(validPlanDate("2026-02-29")).toBe(false);
    expect(validPlanDate("")).toBe(true);
    expect(itineraryDayDate("2026-12-31", 2)?.toISOString().slice(0, 10)).toBe("2027-01-01");
    expect(itineraryDayDate("", 1)).toBeUndefined();
  });
  it("updates clean plans but preserves conflicting and offline drafts", () => {
    const plan = make();
    const remote = { ...plan, title: "Cloud edit", revision: 2 };
    expect(reconcileItineraries([{ plan, dirty: false }], [remote])).toEqual([{ plan: remote, dirty: false }]);
    expect(reconcileItineraries([{ plan, dirty: true }], [remote])).toEqual([{ plan, dirty: true }]);
    expect(reconcileItineraries([{ plan, dirty: true }], [])).toEqual([{ plan, dirty: true }]);
    expect(reconcileItineraries([{ plan, dirty: false }], [])).toEqual([]);
  });
  it("recognizes a late successful save and never silently drops edits after remote deletion", () => {
    const plan = make();
    const remote = { ...plan, revision: 1 };
    expect(reconcileItineraries([{ plan, dirty: true }], [remote])).toEqual([{ plan: remote, dirty: false }]);
    const deleted = { ...remote, deletedAt: "2026-10-17T01:00:00Z", revision: 2 };
    expect(reconcileItineraries([{ plan, dirty: false }], [deleted])).toEqual([]);
    expect(reconcileItineraries([{ plan, dirty: true }], [deleted])).toEqual([{ plan, dirty: true }]);
  });
  for (const { value: locale } of localeOptions) it(`provides complete itinerary copy in ${locale}`, () => {
    expect(travelText(locale, "itinerary")).toBe(itineraryText(locale, "title"));
    for (const key of itineraryCopyKeys) expect(itineraryText(locale, key).trim(), key).not.toBe("");
  });
});
