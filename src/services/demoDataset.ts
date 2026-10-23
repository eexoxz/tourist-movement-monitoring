import { demoDatasetMetadata, initialData, isSampleTourist, mergePreparedDemoDataset, removeBuiltInDemoActivity, removeGeneratedDemoDataset } from "../data/demoData";
import type { AppData, DestinationCategory } from "../types";

export interface DemoDatasetFilters {
  countries: readonly string[];
  preference: DestinationCategory | "all";
  limit: number;
}

export const demoDatasetLimits = [20, 50, 100] as const;
export const demoDatasetPreferences: DestinationCategory[] = ["cultural", "nature", "urban", "heritage", "food", "coastal"];
const prepared = initialData.users.filter((user) => /^tourist-seed-\d{3}$/.test(user.id) && isSampleTourist(user));
const preparedIds = new Set(prepared.map((user) => user.id));
export const demoDatasetCountries = [...new Set(prepared.map((user) => user.nationality!))].sort();
const countsByUser = new Map(prepared.map((user) => [user.id, { trips: 0, points: 0, checkIns: 0 }]));
for (const trip of initialData.trips) { const counts = countsByUser.get(trip.userId); if (counts) counts.trips++; }
for (const point of initialData.points) { const counts = countsByUser.get(point.userId ?? ""); if (counts) counts.points++; }
for (const visit of initialData.checkIns) { const counts = countsByUser.get(visit.userId); if (counts) counts.checkIns++; }

export function previewDemoDataset(data: AppData, filters: DemoDatasetFilters) {
  if (!demoDatasetLimits.some((limit) => limit === filters.limit)) throw new Error("Invalid demo dataset limit");
  const protectedIds = new Set(data.users.filter((user) => !isSampleTourist(user)).map((user) => user.id));
  const countries = new Set(filters.countries);
  const matching = prepared.filter((user) => !protectedIds.has(user.id)
    && countries.has(user.nationality!)
    && (filters.preference === "all" || user.travelPreferences?.includes(filters.preference)));
  const selected = matching.slice(0, filters.limit);
  const totals = selected.reduce((total, user) => {
    const counts = countsByUser.get(user.id)!;
    return { trips: total.trips + counts.trips, points: total.points + counts.points, checkIns: total.checkIns + counts.checkIns };
  }, { trips: 0, points: 0, checkIns: 0 });
  return { userIds: new Set(selected.map((user) => user.id)), matchingCount: matching.length, touristCount: selected.length, ...totals };
}

export function replaceDemoDataset(data: AppData, selectedIds: ReadonlySet<string>): AppData {
  if (selectedIds.size > demoDatasetMetadata.generatedTouristCount || [...selectedIds].some((id) => !preparedIds.has(id))) {
    throw new Error("Invalid demo dataset selection");
  }
  const cleaned = removeBuiltInDemoActivity(removeGeneratedDemoDataset(data));
  return selectedIds.size ? mergePreparedDemoDataset(cleaned, demoDatasetMetadata.generatedTouristCount, selectedIds) : cleaned;
}
