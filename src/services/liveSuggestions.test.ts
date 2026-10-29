import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { DestinationDemand, User } from "../types";
import { createLiveNearbySuggestionSelector, createNearbySuggestionTracker, getLiveNearbySuggestion, nearbySuggestionCooldownMs, type NearbyTrackingInput } from "./liveSuggestions";

const tourist: User = {
  id: "tourist-test",
  name: "Tourist",
  email: "tourist@example.com",
  password: "",
  role: "tourist",
  travelPreferences: ["heritage"],
  trackingSuggestionMode: "balanced",
  trackingSuggestionRadiusKm: 2,
  createdAt: new Date().toISOString(),
};

describe("live nearby suggestions", () => {
  const place = initialData.destinations.find((item) => item.id === "kek-lok-si-temple")!;
  const now = Date.parse("2026-10-30T03:00:00Z");
  const input = (patch: Partial<NearbyTrackingInput> = {}): NearbyTrackingInput => ({
    user: { ...tourist, discoveryLocationMode: "area", discoveryAreaId: "state:Kedah" },
    point: { id: "gps", userId: tourist.id, tripId: "trip-live", source: "browser", recordedAt: new Date(now).toISOString(), accuracyMeters: 15, latitude: place.latitude, longitude: place.longitude },
    destinations: [place], demand: [], activeTripId: "trip-live", listening: true, consent: true, attention: false, ...patch,
  });
  it("triggers at the configured distance during an explicit GPS trip even when browsing another state", () => {
    const tracker = createNearbySuggestionTracker();
    const base = input();
    expect(tracker.update({ ...base, point: { ...base.point!, latitude: place.latitude + .02 } }, now)).toBeNull();
    expect(tracker.update({ ...base, point: { ...base.point!, latitude: place.latitude + .01 } }, now)?.destination.id).toBe(place.id);
    expect(tracker.update({ ...base, activeTripId: undefined }, now)).toBeNull();
  });
  it("requires current owned browser GPS, consent and a running trip; sample, weak, stale and wrong-trip fixes do not trigger", () => {
    const base = input();
    const rejected: Partial<NearbyTrackingInput>[] = [
      { consent: false }, { listening: false }, { attention: true }, { point: undefined },
      { point: { ...base.point!, source: "demo" } }, { point: { ...base.point!, userId: "someone-else" } },
      { point: { ...base.point!, tripId: "old-trip" } }, { point: { ...base.point!, accuracyMeters: 500 } },
      { point: { ...base.point!, recordedAt: new Date(now - 120001).toISOString() } },
      { point: { ...base.point!, recordedAt: new Date(now + 60001).toISOString() } },
      { point: { ...base.point!, latitude: NaN } }, { user: { ...base.user, trackingSuggestionMode: "off" } },
    ];
    for (const patch of rejected) expect(createNearbySuggestionTracker().update({ ...base, ...patch }, now)).toBeNull();
    expect(createNearbySuggestionTracker().update({ ...base, activeTripId: undefined, user: { ...base.user, discoveryLocationMode: "current" } }, now)?.destination.id).toBe(place.id);
  });
  it("keeps a stable card, expires stale GPS without a new reading, and suppresses repeated alerts until a new trip", () => {
    const tracker = createNearbySuggestionTracker(), base = input();
    const first = tracker.update(base, now);
    expect(first).not.toBeNull();
    expect(tracker.update(base, now + 1000)).toBe(first);
    expect(tracker.update(base, now + 120001)).toBeNull();
    expect(tracker.update({ ...base, point: { ...base.point!, recordedAt: new Date(now + 121000).toISOString() } }, now + 121000)).toBeNull();
    expect(tracker.update({ ...base, activeTripId: "next-trip", point: { ...base.point!, tripId: "next-trip", recordedAt: new Date(now + 121000).toISOString() } }, now + 121000)?.destination.id).toBe(place.id);
  });
  it("respects dismissal, cooldown, hide and radius changes without replaying a background alert", () => {
    const other = { ...place, id: "another-real-place-test-fixture", name: "Nearby test fixture", latitude: place.latitude + .001 };
    const tracker = createNearbySuggestionTracker(), base = input({ destinations: [place, other] });
    expect(tracker.update(base, now, false)).toBeNull();
    expect(tracker.update(base, now)?.destination.id).toBe(place.id);
    expect(tracker.update(base, now + 1000, false)).toBeNull();
    expect(tracker.update(base, now + 2000)?.destination.id).toBe(place.id);
    tracker.dismiss();
    expect(tracker.update(base, now + 3000)).toBeNull();
    const later = now + nearbySuggestionCooldownMs + 1;
    const fresh = { ...base, point: { ...base.point!, recordedAt: new Date(later).toISOString() } };
    expect(tracker.update(fresh, later)?.destination.id).toBe(other.id);
    expect(tracker.update({ ...fresh, user: { ...fresh.user, hiddenDestinationIds: [other.id] } }, later)).toBeNull();
    const radiusTracker = createNearbySuggestionTracker();
    const offset = { ...base.point!, latitude: place.latitude + .015 };
    expect(radiusTracker.update({ ...base, destinations: [place], point: offset }, now)).not.toBeNull();
    expect(radiusTracker.update({ ...base, destinations: [place], point: offset, user: { ...base.user, trackingSuggestionRadiusKm: 1 } }, now)).toBeNull();
  });
  it("refreshes catalogue and activity changes while keeping the same ranking as a one-off selection", () => {
    const select = createLiveNearbySuggestionSelector(), base = input();
    expect(select({ ...base, point: base.point! })).toEqual(getLiveNearbySuggestion({ ...base, point: base.point! }));
    const revised = [{ ...place, description: "Updated catalogue information" }];
    expect(select({ ...base, point: base.point!, destinations: revised, onlyDestinationId: place.id })?.destination).toBe(revised[0]);
    expect(select({ ...base, point: base.point!, destinations: [], onlyDestinationId: place.id })).toBeNull();
  });
  it("honours hidden places and the chosen alert radius", () => {
    const destination = initialData.destinations.find((place) => place.id === "kek-lok-si-temple")!;
    const input = { point: destination, destinations: [destination], demand: [], user: { ...tourist, hiddenDestinationIds: [destination.id] } };
    expect(getLiveNearbySuggestion(input)).toBeNull();
    expect(getLiveNearbySuggestion({ ...input, point: { latitude: destination.latitude + 0.02, longitude: destination.longitude }, user: { ...tourist, trackingSuggestionRadiusKm: 1 } })).toBeNull();
    expect(getLiveNearbySuggestion({ ...input, point: { latitude: destination.latitude + 0.02, longitude: destination.longitude }, user: { ...tourist, trackingSuggestionRadiusKm: 3 } })?.destination.id).toBe(destination.id);
  });
  it("suggests a nearby destination instead of a far away popular one", () => {
    const kekLokSi = initialData.destinations.find((destination) => destination.name === "Kek Lok Si Temple");
    const klcc = initialData.destinations.find((destination) => destination.name === "KLCC Park");

    expect(kekLokSi).toBeTruthy();
    expect(klcc).toBeTruthy();

    const demand: DestinationDemand[] = [
      {
        destinationId: klcc!.id,
        movementPointCount: 999,
        uniqueTouristCount: 220,
        recentPointCount: 300,
        approachSignalCount: 100,
        approachingTouristCount: 80,
        popularityScore: 1000,
        tier: "high",
      },
    ];

    const suggestion = getLiveNearbySuggestion({
      point: { latitude: kekLokSi!.latitude + 0.003, longitude: kekLokSi!.longitude + 0.003 },
      destinations: initialData.destinations,
      demand,
      user: tourist,
    });

    expect(suggestion?.destination.id).toBe(kekLokSi!.id);
  });

  it("does not suggest anything when tracking suggestions are disabled", () => {
    const destination = initialData.destinations[0];
    const suggestion = getLiveNearbySuggestion({
      point: destination,
      destinations: initialData.destinations,
      demand: [],
      user: { ...tourist, trackingSuggestionMode: "off" },
    });

    expect(suggestion).toBeNull();
  });
});
