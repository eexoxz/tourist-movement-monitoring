import type { AnalysisResult, AppData, TouristProfile } from "../types";
import { isSampleTourist } from "../data/demoData";

export const aiProfiles: TouristProfile[] = ["cultural", "nature", "urban", "mixed"];
export type TripRecordingSource = "browser" | "sample" | "mixed" | "none";
const emptyProfiles = () => ({ cultural: 0, nature: 0, urban: 0, mixed: 0 });

export function summarizeAiResults(data: AppData, analyses: readonly AnalysisResult[]) {
  const completed = new Map(data.trips.filter((trip) => trip.status === "completed").map((trip) => [trip.id, trip]));
  const results = new Map(analyses.filter((analysis) => completed.get(analysis.tripId)?.userId === analysis.userId).map((analysis) => [analysis.tripId, analysis]));
  const users = new Map(data.users.map((user) => [user.id, user]));
  const flags = new Map<string, number>();
  for (const point of data.points) {
    if (!completed.has(point.tripId)) continue;
    flags.set(point.tripId, (flags.get(point.tripId) ?? 0) | (point.source === "browser" ? 1 : point.source === "demo" ? 2 : 4));
  }
  const sourceByTrip = new Map<string, TripRecordingSource>();
  const sources = { browser: 0, sample: 0, mixed: 0, none: 0 };
  for (const trip of completed.values()) {
    const flag = flags.get(trip.id) ?? 0;
    const source = flag === 1 ? "browser" : flag === 2 ? "sample" : flag ? "mixed" : "none";
    sourceByTrip.set(trip.id, source);
    sources[source]++;
  }
  const groups = new Map<number, { cluster: number; label: string; size: number; profileCounts: Record<TouristProfile, number>; silhouetteTotal: number }>();
  const profileCounts = emptyProfiles();
  let sparseTripCount = 0;
  let labelledSamples = 0;
  let labelledOther = 0;
  for (const analysis of results.values()) {
    const group = groups.get(analysis.cluster) ?? { cluster: analysis.cluster, label: analysis.clusterLabel, size: 0, profileCounts: emptyProfiles(), silhouetteTotal: 0 };
    group.size++;
    group.profileCounts[analysis.profile]++;
    group.silhouetteTotal += Number.isFinite(analysis.silhouetteScore) ? analysis.silhouetteScore : 0;
    groups.set(analysis.cluster, group);
    profileCounts[analysis.profile]++;
    if (Object.values(analysis.categoryCounts).reduce((sum, value) => sum + value, 0) < 2) sparseTripCount++;
    const user = users.get(analysis.userId);
    if (user?.expectedProfile) {
      if (isSampleTourist(user)) labelledSamples++; else labelledOther++;
    }
  }
  return {
    completedTripCount: completed.size, analysedTripCount: results.size, insufficientTripCount: completed.size - results.size,
    sparseTripCount, sources, sourceByTrip, profileCounts, labelledSamples, labelledOther,
    clusters: [...groups.values()].sort((a, b) => a.cluster - b.cluster).map((group) => ({ ...group, averageSilhouette: Number((group.silhouetteTotal / group.size).toFixed(2)) })),
  };
}

export type AiInsights = ReturnType<typeof summarizeAiResults>;
