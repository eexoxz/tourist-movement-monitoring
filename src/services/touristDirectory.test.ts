import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { getTouristManagementRows } from "./touristManagement";
import { defaultDirectoryFilters, directoryPage, filterDirectoryRows, sortDirectoryRows, type DirectoryFilters } from "./touristDirectory";

const rows = getTouristManagementRows(initialData);
const base = rows[0];
const registered = { ...base, tourist: { ...base.tourist, id: "real-tourist", name: "Registered Traveller", authUid: "real-auth", nationality: "Malaysia", passportNumber: "A12345678", travelPreferences: ["nature" as const] }, profile: "nature" as const, totalTrips: 2, activeTrips: 1, openSafetyCases: 1, consentGranted: false };
const inactive = { ...registered, tourist: { ...registered.tourist, id: "new-tourist", name: "New Traveller", passportNumber: "", travelPreferences: [], profileCompletedAt: undefined }, totalTrips: 0, activeTrips: 0, openSafetyCases: 0, latestActivityAt: undefined };
const filter = (settings: Partial<DirectoryFilters>) => filterDirectoryRows([...rows, registered, inactive], { ...defaultDirectoryFilters, ...settings });

describe("compact tourist directory", () => {
  it("combines source, country, passport search, profile, consent and safety filters", () => {
    const result = filter({ source: "registered", country: "malaysia", search: "a-1234-5678", profile: "nature", interest: "nature", activity: "active", consent: "missing", safety: "open", identity: "provided" });
    expect(result).toEqual([registered]);
    expect(filter({ source: "sample" })).toEqual(rows);
    expect(filter({ source: "registered" })).toEqual([registered, inactive]);
    expect(filter({ source: "registered", activity: "none", identity: "missing", safety: "clear", profile: "incomplete" })).toEqual([inactive]);
    expect(filter({ source: "registered", activity: "trips" })).toEqual([registered]);
  });

  it("paginates the entire filtered result without duplicates or gaps", () => {
    const ordered = sortDirectoryRows(rows, { key: "name", direction: "asc" }, "en");
    const seen: string[] = [];
    for (let page = 1; page <= Math.ceil(rows.length / 25); page++) {
      const result = directoryPage(ordered, page, 25);
      expect(result.rows.length).toBeLessThanOrEqual(25);
      seen.push(...result.rows.map((row) => row.tourist.id));
    }
    expect(seen).toEqual(ordered.map((row) => row.tourist.id));
    expect(new Set(seen).size).toBe(rows.length);
    expect(directoryPage([], 99, 25)).toMatchObject({ from: 0, to: 0, page: 1, pages: 1, total: 0 });
    expect(directoryPage(rows.slice(0, 3), 99, 25).page).toBe(1);
    expect(directoryPage(rows, -2, 10000).rows).toHaveLength(25);
  });

  it("sorts numeric columns numerically without mutating its input", () => {
    const input = [{ ...base, totalTrips: 2 }, { ...registered, totalTrips: 12 }, { ...inactive, totalTrips: 0 }];
    expect(sortDirectoryRows(input, { key: "trips", direction: "desc" }, "en").map((row) => row.totalTrips)).toEqual([12, 2, 0]);
    expect(input.map((row) => row.totalTrips)).toEqual([2, 12, 0]);
    const tied = [{ ...registered, totalTrips: 2 }, { ...base, totalTrips: 2 }];
    expect(sortDirectoryRows(tied, { key: "trips", direction: "desc" }, "en")).toEqual(sortDirectoryRows([...tied].reverse(), { key: "trips", direction: "desc" }, "en"));
    expect(sortDirectoryRows([{ ...inactive, latestActivityAt: "not-a-date" }, registered], { key: "latest", direction: "desc" }, "en")[0]).toBe(registered);
  });
});
