import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { discoveryAreas } from "../data/discoveryAreas";
import { discoveryRadiusKm, getDiscoveryDestinations, getDiscoveryReference, getLatestDiscoveryPoint, getLocalEventAnnouncement } from "./discovery";
import { discoveryText, type DiscoveryCopyKey } from "./discoveryCopy";
import { localeOptions } from "./i18n";
import { recommendForUser } from "./analytics";
import type { FestivalEvent, User } from "../types";

const user: User = { ...initialData.users[0], id: "discovery-test", hiddenDestinationIds: [] };

describe("privacy-aware local discovery", () => {
  it("uses fresh stationary GPS readings instead of the last saved route point", () => {
    const routePoint = { ...initialData.points[0], recordedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() };
    const gpsPoint = { ...routePoint, recordedAt: new Date().toISOString() };
    expect(getLatestDiscoveryPoint(routePoint, gpsPoint)).toBe(gpsPoint);
    expect(getDiscoveryReference(user, getLatestDiscoveryPoint(routePoint, gpsPoint))).toBe(gpsPoint);
    expect(getLatestDiscoveryPoint(gpsPoint, routePoint)).toBe(gpsPoint);
    expect(getLatestDiscoveryPoint(undefined, { ...routePoint, recordedAt: "invalid" })).toBeUndefined();
  });

  it("uses the chosen district without creating or altering movement records", () => {
    const before = initialData.points.length;
    const gpsPoint = initialData.points[0];
    const point = getDiscoveryReference({ ...user, discoveryLocationMode: "area", discoveryAreaId: "air-itam" }, gpsPoint);
    expect(point?.latitude).toBe(5.4);
    expect(point?.tripId).toBe("");
    expect(getDiscoveryDestinations(initialData.destinations, user, point).every((place) => place.city === "Penang")).toBe(true);
    expect(initialData.points).toHaveLength(before);
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
      for (const key of keys) expect(discoveryText(locale, key).length).toBeGreaterThan(0);
    }
  });
});
