import { describe, expect, it } from "vitest";
import type { AppData, MovementPoint, TripSession } from "../types";
import { initialData } from "../data/demoData";
import { analyzeAllTrips, evaluateAiOutput } from "./analytics";
import { summarizeAiResults } from "./aiInsights";

function fixture(): AppData {
  const sample = initialData.users[0];
  const registered = { ...sample, id: "registered", authUid: "registered", expectedProfile: "cultural" as const };
  const trip = (id: string, userId = registered.id, status: TripSession["status"] = "completed"): TripSession => ({ ...initialData.trips[0], id, userId, status });
  const points = (tripId: string, source: MovementPoint["source"] = "browser") => [0, 1].map((index): MovementPoint => ({ ...initialData.points[0], id: `${tripId}-${index}`, userId: tripId === "gps" ? sample.id : registered.id, tripId, source, accuracyMeters: 20, recordedAt: `2026-10-20T10:0${index * 2}:00Z` }));
  return { ...initialData, users: [sample, registered], trips: [trip("gps", sample.id), trip("sample"), trip("mixed"), trip("empty"), trip("poor"), trip("sparse"), trip("active", registered.id, "active")], points: [
    ...points("gps"), ...points("sample", "demo"), ...points("mixed").map((point, index) => ({ ...point, source: index ? "demo" as const : "browser" as const })),
    ...points("poor").map((point) => ({ ...point, accuracyMeters: 999 })), ...points("sparse").map((point) => ({ ...point, latitude: 46, longitude: 10 })), ...points("active"),
  ], analyses: [], recommendations: [], checkIns: [], sosAlerts: [], incidentReports: [] };
}

describe("AI results evidence summaries", () => {
  it("counts completed trips, source provenance and quality exclusions without equating accounts with GPS", () => {
    const data = fixture();
    const analyses = analyzeAllTrips(data);
    const insights = summarizeAiResults(data, analyses);
    expect(insights.completedTripCount).toBe(6);
    expect(insights.analysedTripCount).toBe(4);
    expect(insights.insufficientTripCount).toBe(2);
    expect(insights.sparseTripCount).toBe(1);
    expect(insights.sources).toEqual({ browser: 3, sample: 1, mixed: 1, none: 1 });
    expect(insights.sourceByTrip.get("gps")).toBe("browser");
    expect(insights.sourceByTrip.get("sample")).toBe("sample");
    expect(insights.sourceByTrip.has("active")).toBe(false);
    expect(insights.labelledSamples).toBe(1);
    expect(insights.labelledOther).toBe(3);
    const evaluation = evaluateAiOutput(data, analyses);
    expect(evaluation.insufficientTripCount).toBe(2);
    expect(evaluation.validClusteredRecordCount).toBe(4);
    expect(evaluation.labelledRecordCount).toBe(insights.labelledSamples + insights.labelledOther);
  });

  it("builds cluster compositions from distinct valid trip results, not the number of people", () => {
    const data = fixture();
    const analyses = analyzeAllTrips(data);
    const insights = summarizeAiResults(data, [...analyses, analyses[0], { ...analyses[0], tripId: "missing-trip" }, { ...analyses[0], userId: "wrong-owner" }]);
    expect(insights.analysedTripCount).toBe(4);
    expect(insights.clusters.reduce((sum, cluster) => sum + cluster.size, 0)).toBe(4);
    expect(Object.values(insights.profileCounts).reduce((sum, count) => sum + count, 0)).toBe(4);
    expect(data.users).toHaveLength(2);
    for (const cluster of insights.clusters) {
      expect(Object.values(cluster.profileCounts).reduce((sum, count) => sum + count, 0)).toBe(cluster.size);
      const members = analyses.filter((analysis) => analysis.cluster === cluster.cluster);
      expect(cluster.averageSilhouette).toBe(Number((members.reduce((sum, analysis) => sum + analysis.silhouetteScore, 0) / members.length).toFixed(2)));
    }
  });

  it("reports zero data without invented bars, labels or invalid averages", () => {
    const data = { ...initialData, trips: [], points: [], users: [] };
    const insights = summarizeAiResults(data, []);
    expect(insights.clusters).toEqual([]);
    expect(insights.analysedTripCount).toBe(0);
    expect(insights.insufficientTripCount).toBe(0);
    expect(insights.labelledSamples + insights.labelledOther).toBe(0);
    expect(Object.values(insights.sources)).toEqual([0, 0, 0, 0]);
    expect(evaluateAiOutput(data, []).labelledRecordCount).toBe(0);
  });
});
