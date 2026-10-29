import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { discoveryAreas, discoveryStates, getDiscoveryAreasForState } from "../data/discoveryAreas";
import { discoveryRadiusKm, getDiscoveryDestinations, getDiscoveryReference, getLatestDiscoveryPoint, getLocalEventAnnouncement } from "./discovery";
import { discoveryText, type DiscoveryCopyKey } from "./discoveryCopy";
import { localeOptions } from "./i18n";
import { recommendForUser } from "./analytics";
import type { FestivalEvent, User } from "../types";

const user: User = { ...initialData.users[0], id: "discovery-test", hiddenDestinationIds: [] };

describe("privacy-aware local discovery", () => {
  it("browses nationwide without a selected state or GPS while respecting hidden places", () => {
    const nationwide = { ...user, discoveryLocationMode: "area" as const, discoveryAreaId: "", hiddenDestinationIds: [initialData.destinations[0].id] };
    const expected = initialData.destinations.slice(1);
    expect(getDiscoveryReference(nationwide)).toBeUndefined();
    expect(getDiscoveryDestinations(initialData.destinations, nationwide)).toEqual(expected);
    expect(getDiscoveryDestinations(initialData.destinations, { ...nationwide, discoveryLocationMode: "current" })).toEqual(expected);
    expect(getDiscoveryDestinations(initialData.destinations, { ...nationwide, discoveryAreaId: "missing" })).toEqual([]);
  });
  it("groups every existing area by state without mixing states or duplicating options", () => {
    expect(discoveryStates).toHaveLength(14);
    expect(getDiscoveryAreasForState("")).toEqual([]);
    expect(getDiscoveryAreasForState("Penang").map((area) => area.id)).toContain("jelutong");
    expect(getDiscoveryAreasForState("Penang").map((area) => area.id)).toContain("batu-kawan");
    expect(getDiscoveryAreasForState("Kedah").map((area) => area.id)).toContain("alor-setar");
    const grouped = discoveryStates.flatMap(getDiscoveryAreasForState);
    expect(grouped).toHaveLength(discoveryAreas.length);
    expect(new Set(grouped.map((area) => area.id)).size).toBe(discoveryAreas.length);
    for (const state of discoveryStates) {
      expect(getDiscoveryAreasForState(state).every((area) => area.state === state)).toBe(true);
    }
  });
  it("uses fresh stationary GPS readings instead of the last saved route point", () => {
    const routePoint = { ...initialData.points[0], source: "browser" as const, recordedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() };
    const gpsPoint = { ...routePoint, recordedAt: new Date().toISOString() };
    expect(getLatestDiscoveryPoint(routePoint, gpsPoint)).toBe(gpsPoint);
    expect(getDiscoveryReference(user, getLatestDiscoveryPoint(routePoint, gpsPoint))).toBe(gpsPoint);
    expect(getLatestDiscoveryPoint(gpsPoint, routePoint)).toBe(gpsPoint);
    expect(getLatestDiscoveryPoint({ ...gpsPoint, source: "demo", recordedAt: new Date(Date.now() + 1000).toISOString() }, gpsPoint)).toBe(gpsPoint);
    expect(getLatestDiscoveryPoint({ ...gpsPoint, source: "demo" })).toBeUndefined();
    expect(getLatestDiscoveryPoint(undefined, { ...routePoint, recordedAt: "invalid" })).toBeUndefined();
    expect(getLatestDiscoveryPoint(gpsPoint, { ...routePoint, recordedAt: new Date(Date.now() + 10 * 60000).toISOString() })).toBe(gpsPoint);
  });

  it("uses a state reference without creating or altering movement records", () => {
    const before = initialData.points.length;
    const gpsPoint = initialData.points[0];
    const point = getDiscoveryReference({ ...user, discoveryLocationMode: "area", discoveryAreaId: "air-itam" }, gpsPoint);
    expect(point?.latitude).toBe(5.42);
    expect(point?.tripId).toBe("");
    expect(getDiscoveryDestinations(initialData.destinations, user, point).every((place) => place.city === "Penang")).toBe(true);
    expect(initialData.points).toHaveLength(before);
  });
  it("includes far-apart locations within a chosen state without leaking adjacent states", () => {
    const kedah = { ...user, discoveryLocationMode: "area" as const, discoveryAreaId: "state:Kedah" };
    const locations = [
      { ...initialData.destinations[0], id: "mainland", city: "Alor Setar", state: "Kedah" as const, latitude: 6.12, longitude: 100.37 },
      { ...initialData.destinations[0], id: "island", city: "Langkawi", state: "Kedah" as const, latitude: 6.3, longitude: 99.8 },
      { ...initialData.destinations[0], id: "other", city: "Penang", latitude: 5.4, longitude: 100.3 },
    ];
    expect(getDiscoveryDestinations(locations, kedah, getDiscoveryReference(kedah)).map((place) => place.id)).toEqual(["mainland", "island"]);
    expect(getDiscoveryDestinations(locations, { ...kedah, discoveryAreaId: "missing" })).toEqual([]);
  });

  it("does not silently use old GPS for an invalid or unselected area", () => {
    expect(getDiscoveryReference({ ...user, discoveryLocationMode: "area" }, initialData.points[0])).toBeUndefined();
    expect(getDiscoveryReference({ ...user, discoveryLocationMode: "area", discoveryAreaId: "missing" }, initialData.points[0])).toBeUndefined();
    expect(getDiscoveryReference(user)).toBeUndefined();
    expect(getDiscoveryReference(user, { ...initialData.points[0], recordedAt: "2020-01-01T00:00:00Z" })).toBeUndefined();
    const freshPoint = { ...initialData.points[0], recordedAt: new Date().toISOString() };
    expect(getDiscoveryReference(user, freshPoint)).toBe(freshPoint);
    expect(recommendForUser(user.id, initialData, undefined, undefined, undefined, { localOnly: true, ignoreHistoryLocation: true })).toEqual([]);
  });

  it("returns no distant replacements for an area with no catalogue coverage", () => {
    const point = getDiscoveryReference({ ...user, discoveryLocationMode: "area", discoveryAreaId: "alor-setar" })!;
    const data = { ...initialData, users: [...initialData.users, user] };
    expect(getDiscoveryDestinations(data.destinations, user, point)).toEqual([]);
    expect(recommendForUser(user.id, data, undefined, undefined, point, { localOnly: true, radiusKm: discoveryRadiusKm })).toEqual([]);
  });

  it("excludes hidden places from local browsing and generated recommendations", () => {
    const hiddenUser = { ...user, hiddenDestinationIds: ["kek-lok-si-temple"] };
    const point = getDiscoveryReference({ ...hiddenUser, discoveryLocationMode: "area", discoveryAreaId: "air-itam" })!;
    const data = { ...initialData, users: [...initialData.users, hiddenUser] };
    expect(getDiscoveryDestinations(data.destinations, hiddenUser, point).some((place) => place.id === "kek-lok-si-temple")).toBe(false);
    expect(recommendForUser(user.id, data, undefined, undefined, point, { localOnly: true, radiusKm: discoveryRadiusKm }).some((item) => item.destinationId === "kek-lok-si-temple")).toBe(false);
  });

  it("only announces nearby-state or nationwide events in the next fortnight", () => {
    const base: FestivalEvent = { id: "event", name: "Event", date: "2026-10-08", scope: "state", states: ["Sarawak"], category: "cultural", description: "", destinationIds: [] };
    const point = getDiscoveryReference({ ...user, discoveryLocationMode: "area", discoveryAreaId: "air-itam" });
    const events = [base, { ...base, id: "past", date: "2026-09-01", states: ["Penang"] as const }, { ...base, id: "later", date: "2026-11-01", states: ["Penang"] as const }, { ...base, id: "local", states: ["Penang"] as const }];
    expect(getLocalEventAnnouncement(events as FestivalEvent[], point, new Date("2026-10-03T12:00:00"))?.id).toBe("local");
    expect(getLocalEventAnnouncement([base], undefined)).toBeNull();
  });

  it("offers coverage for every Malaysian state and all nine UI languages", () => {
    expect(new Set(discoveryAreas.map((area) => area.state)).size).toBe(14);
    const keys: DiscoveryCopyKey[] = ["location", "current", "area", "choose", "privacy", "fromArea", "centreArea", "nearby", "popular", "preference", "view", "hide", "dismiss", "settings", "announcements", "event", "viewEvent", "hidden", "restore", "noLocal", "distance", "locationNeeded"];
    for (const { value: locale } of localeOptions) {
      expect(discoveryText(locale, "chooseState").length).toBeGreaterThan(0);
      for (const key of keys) expect(discoveryText(locale, key).length).toBeGreaterThan(0);
    }
  });
});
