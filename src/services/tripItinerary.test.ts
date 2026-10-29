import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData, AttractionCheckIn, MovementPoint, TripSession } from "../types";
import { addItineraryStop, createItinerary } from "./itineraries";
import { startTripSession } from "./movement";
import { dueItineraryStop, malaysiaDate, setTripItineraryReminders, snapshotItineraryDay, tripItineraryProgress, validTripItinerary } from "./tripItinerary";
import { loadItineraryDismissals, saveItineraryDismissals } from "./itineraryReminderState";
import { localeOptions } from "./i18n";
import { tripItineraryKeys, tripPlanText } from "./tripItineraryCopy";

const user = initialData.users.find((item) => item.role === "tourist")!;
const places = initialData.destinations;
const makePlan = () => ({ ...addItineraryStop(createItinerary(user.id, "Heritage day"), places[0], 1), revision: 1 });
const makeTrip = (reminders = true): TripSession => {
  const plan = makePlan();
  plan.stops[0] = { ...plan.stops[0], arrivalTime: "10:00", departureTime: "10:30", note: "Meet at the entrance" };
  return { id: "trip-plan-test", userId: user.id, status: "active", consentId: "consent", startedAt: "2026-10-30T01:00:00Z", itinerary: snapshotItineraryDay(plan, user.id, 1, "2026-10-30T01:00:00Z", reminders)! };
};
const point = (index: number, source: "browser" | "demo" = "browser"): MovementPoint => ({ id: `point-${index}`, tripId: "trip-plan-test", userId: user.id, latitude: places[0].latitude, longitude: places[0].longitude, accuracyMeters: 20, recordedAt: new Date(Date.parse("2026-10-30T01:00:00Z") + index * 60000).toISOString(), source });
const checkIn = (patch: Partial<AttractionCheckIn> = {}): AttractionCheckIn => ({ id: "visit", userId: user.id, tripId: "trip-plan-test", destinationId: places[0].id, status: "checked-in", checkedInAt: "2026-10-30T01:30:00Z", ...patch });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-30T02:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("itinerary-linked trips", () => {
  it("starts optionally with an owned saved day and keeps its snapshot independent of later plan edits", () => {
    const data: AppData = { ...initialData, trips: [], points: [], consents: [{ id: "consent", userId: user.id, granted: true }] };
    const plan = makePlan();
    const plain = startTripSession(data, user.id);
    expect(plain.trip?.itinerary).toBeUndefined();
    const linked = startTripSession(data, user.id, { plan, day: 1, reminders: true });
    expect(linked.trip?.itinerary).toMatchObject({ title: "Heritage day", date: "2026-10-30", reminders: true });
    plan.title = "Changed later"; plan.stops[0].note = "Changed later";
    expect(linked.trip?.itinerary?.title).toBe("Heritage day");
    expect(linked.trip?.itinerary?.stops[0].note).toBe("");
    expect(startTripSession(data, user.id, { plan: { ...plan, userId: "another-owner" }, day: 1, reminders: false }).error).toBeTruthy();
    expect(startTripSession(data, user.id, { plan: { ...plan, revision: 0 }, day: 1, reminders: false }).error).toBeTruthy();
    expect(startTripSession({ ...data, consents: [] }, user.id, { plan, day: 1, reminders: true }).error).toContain("consent");
  });
  it("binds only the selected day to the actual Malaysia trip date and rejects invalid snapshots", () => {
    let plan = { ...makePlan(), days: 2 };
    plan = addItineraryStop(plan, places[1], 2);
    const snapshot = snapshotItineraryDay(plan, user.id, 2, "2026-10-30T17:00:00Z", false)!;
    expect(snapshot.date).toBe("2026-10-31");
    expect(snapshot.stops.map((stop) => stop.destinationId)).toEqual([places[1].id]);
    expect(validTripItinerary(snapshot)).toBe(true);
    for (const patch of [{ date: "2026-02-30" }, { day: 1 }, { stops: [] }, { stops: [null] }, { revision: 0 }, { reminders: "yes" }]) expect(validTripItinerary({ ...snapshot, ...patch })).toBe(false);
    expect(malaysiaDate("not-a-date")).toBe("");
    expect(malaysiaDate(Number.MAX_VALUE)).toBe("");
  });
  it("never counts a plan or a passing GPS point as a visit; genuine dwell and owner check-ins do count", () => {
    const trip = makeTrip();
    expect(tripItineraryProgress(trip, [], [], places)?.visited).toBe(0);
    expect(tripItineraryProgress(trip, [point(0)], [], places)?.visited).toBe(0);
    const dwell = Array.from({ length: 4 }, (_, i) => point(i));
    expect(tripItineraryProgress(trip, dwell, [], places)?.stops[0].state).toBe("gps");
    expect(tripItineraryProgress(trip, [], [checkIn({ tripId: undefined })], places)?.stops[0].state).toBe("checkIn");
    const unrelated = [checkIn({ userId: "other" }), checkIn({ tripId: "other" }), checkIn({ checkedInAt: "2026-10-29T01:00:00Z" })];
    expect(tripItineraryProgress(trip, dwell.map((item) => ({ ...item, userId: "other" })), unrelated, places)?.visited).toBe(0);
    expect(tripItineraryProgress({ ...trip, status: "completed", endedAt: "2026-10-30T01:10:00Z" }, [], [checkIn()], places)?.visited).toBe(0);
  });
  it("separates sample activity and unplanned recorded places from followed stops", () => {
    const trip = makeTrip();
    const result = tripItineraryProgress(trip, [point(0, "demo")], [checkIn({ isDemo: true }), checkIn({ id: "other-place", destinationId: places[1].id })], places)!;
    expect(result.visited).toBe(0); expect(result.stops[0].state).toBe("sample");
    expect(result.otherIds).toEqual([places[1].id]);
  });
  it("offers a recent due reminder once per stop and suppresses disabled, dismissed, stale and recorded visits", () => {
    const trip = makeTrip();
    const progress = tripItineraryProgress(trip, [], [], places)!;
    const due = Date.parse("2026-10-30T02:00:00Z");
    expect(dueItineraryStop(progress, due - 1, new Set())).toBeUndefined();
    expect(dueItineraryStop(progress, due, new Set())?.id).toBe(progress.stops[0].id);
    expect(dueItineraryStop(progress, due + 600001, new Set())).toBeUndefined();
    expect(dueItineraryStop(progress, due, new Set([progress.stops[0].id]))).toBeUndefined();
    expect(dueItineraryStop(tripItineraryProgress(makeTrip(false), [], [], places)!, due, new Set())).toBeUndefined();
    expect(dueItineraryStop(tripItineraryProgress(trip, [], [checkIn()], places)!, due, new Set())).toBeUndefined();
  });
  it("limits reminder changes to the owner's active trip and scopes dismissal storage by owner and trip", () => {
    const trip = makeTrip(); const data = { ...initialData, trips: [trip] };
    expect(setTripItineraryReminders(data, "other", trip.id, false)).toBeNull();
    expect(setTripItineraryReminders({ ...data, trips: [{ ...trip, status: "completed" }] }, user.id, trip.id, false)).toBeNull();
    expect(setTripItineraryReminders(data, user.id, trip.id, false)?.trips[0].itinerary).toEqual({ ...trip.itinerary, reminders: false });
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) });
    saveItineraryDismissals(user.id, trip.id, new Set(["stop-a"]));
    expect([...loadItineraryDismissals(user.id, trip.id)]).toEqual(["stop-a"]);
    expect(loadItineraryDismissals("other", trip.id).size).toBe(0);
    expect(loadItineraryDismissals(user.id, "another-trip").size).toBe(0);
  });
  it("provides every trip-plan label and reminder placeholder in all nine languages", () => {
    for (const { value: locale } of localeOptions) for (const key of tripItineraryKeys) {
      const copy = tripPlanText(locale, key);
      expect(copy.trim()).not.toBe("");
      expect((copy.match(/\{\w+\}/g) ?? []).sort()).toEqual((tripPlanText("en", key).match(/\{\w+\}/g) ?? []).sort());
    }
  });
});
