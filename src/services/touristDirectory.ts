import type { DestinationCategory, TouristProfile } from "../types";
import { isSampleTourist } from "../data/demoData";
import type { TouristManagementRow } from "./touristManagement";
import { matchesTouristIdentity, type IdentityFilter } from "./touristReports";
import type { Locale } from "./i18n";

export type DirectoryFilters = {
  search: string; country: string; profile: TouristProfile | "all" | "incomplete";
  source: "all" | "registered" | "sample"; identity: IdentityFilter;
  activity: "all" | "active" | "trips" | "none";
  consent: "all" | "granted" | "missing"; safety: "all" | "open" | "clear";
  interest: DestinationCategory | "all";
};
export const defaultDirectoryFilters: DirectoryFilters = { search: "", country: "all", profile: "all", source: "all", identity: "all", activity: "all", consent: "all", safety: "all", interest: "all" };
export type DirectorySortKey = "name" | "country" | "profile" | "trips" | "points" | "checkIns" | "safety" | "latest";
export type DirectorySort = { key: DirectorySortKey; direction: "asc" | "desc" };

export function filterDirectoryRows(rows: TouristManagementRow[], filters: DirectoryFilters) {
  return rows.filter((row) => {
    const sample = isSampleTourist(row.tourist);
    return matchesTouristIdentity(row.tourist, filters.search, filters.country, filters.identity)
      && (filters.profile === "all" || (filters.profile === "incomplete" ? !row.tourist.profileCompletedAt && !row.tourist.travelPreferences?.length : row.profile === filters.profile))
      && (filters.source === "all" || (filters.source === "sample" ? sample : !sample))
      && (filters.activity === "all" || (filters.activity === "active" ? row.activeTrips > 0 : filters.activity === "trips" ? row.totalTrips > 0 : row.totalTrips === 0))
      && (filters.consent === "all" || row.consentGranted === (filters.consent === "granted"))
      && (filters.safety === "all" || (filters.safety === "open" ? row.openSafetyCases > 0 : row.openSafetyCases === 0))
      && (filters.interest === "all" || row.tourist.travelPreferences?.includes(filters.interest));
  });
}

export function sortDirectoryRows(rows: TouristManagementRow[], sort: DirectorySort, locale: Locale) {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const dateValue = (value: string | undefined) => { const time = value ? Date.parse(value) : 0; return Number.isFinite(time) ? time : 0; };
  const value = (row: TouristManagementRow): string | number => {
    switch (sort.key) {
      case "name": return row.tourist.name;
      case "country": return row.tourist.nationality ?? "";
      case "profile": return row.profile ?? "";
      case "trips": return row.totalTrips;
      case "points": return row.movementPoints;
      case "checkIns": return row.checkIns;
      case "safety": return row.openSafetyCases;
      case "latest": return dateValue(row.latestActivityAt);
    }
  };
  return [...rows].sort((a, b) => {
    const left = value(a), right = value(b);
    const comparison = typeof left === "number" && typeof right === "number" ? left - right : collator.compare(String(left), String(right));
    return comparison * (sort.direction === "asc" ? 1 : -1) || collator.compare(a.tourist.id, b.tourist.id);
  });
}

export function directoryPage<T>(rows: T[], requestedPage: number, pageSize: number) {
  const size = [10, 25, 50].includes(pageSize) ? pageSize : 25;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.max(1, Math.min(pages, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1));
  const start = (page - 1) * size;
  return { rows: rows.slice(start, start + size), page, pages, from: rows.length ? start + 1 : 0, to: Math.min(start + size, rows.length), total: rows.length };
}
