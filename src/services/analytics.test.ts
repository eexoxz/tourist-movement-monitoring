import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { getMovementDashboardViews } from "./dashboard";
import type { AppData, MovementPoint, TripSession } from "../types";
import {
  analyzeAllTrips,
  calculateDestinationDemand,
  calculateMovementAlerts,
  buildMovementAlertsCsv,
  buildTravelPlanCsv,
  createMovementBasedTravelPlan,
  evaluateAiOutput,
  getDestinationDemand,
  recommendForUser,
  refreshAllRecommendations,
} from "./analytics";

function countAnalyzableCompletedTrips(data: AppData) {
  return data.trips.filter((trip) => trip.status === "completed" && data.points.filter((point) => point.tripId === trip.id).length >= 2).length;
}

describe("analytics service", () => {
  it("reuses demand only for unchanged data, the same source mode and a short time window", () => {
    const data = { ...initialData, trips: [...initialData.trips], points: [...initialData.points], destinations: [...initialData.destinations] };
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const results = calculateDestinationDemand(data);
      expect(calculateDestinationDemand({ ...data, users: [...data.users] })).toBe(results);
      expect(calculateDestinationDemand(data, { includeDemo: false })).not.toBe(results);
      expect(calculateDestinationDemand(data)).toBe(results);
      expect(calculateDestinationDemand(data, { now })).toEqual(results);
      expect(calculateDestinationDemand(data, { now })).not.toBe(results);
      for (const changed of [{ ...data, points: [] }, { ...data, trips: [] }, { ...data, destinations: [] }]) {
        const previous = calculateDestinationDemand(data);
        expect(calculateDestinationDemand(changed)).not.toBe(previous);
      }
      const latest = calculateDestinationDemand(data);
      clock.mockReturnValue(now + 5001);
      expect(calculateDestinationDemand(data)).not.toBe(latest);
      const later = calculateDestinationDemand(data);
      clock.mockReturnValue(now);
      expect(calculateDestinationDemand(data)).not.toBe(later);
    } finally {
      clock.mockRestore();
    }
  });

  it("reuses unchanged analysis but invalidates every movement input and its time window", () => {
    const tripIds = new Set(initialData.trips.slice(0, 3).map((trip) => trip.id));
    const data = { ...initialData, trips: initialData.trips.slice(0, 3), points: initialData.points.filter((point) => tripIds.has(point.tripId)) };
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const results = analyzeAllTrips(data);
      expect(analyzeAllTrips({ ...data, users: [...data.users] })).toBe(results);
      for (const changed of [{ ...data, points: [...data.points] }, { ...data, trips: [...data.trips] }, { ...data, destinations: [...data.destinations] }]) {
        const previous = analyzeAllTrips(data);
        expect(analyzeAllTrips(changed)).not.toBe(previous);
      }
      const latest = analyzeAllTrips(data);
      clock.mockReturnValue(now + 60001);
      expect(analyzeAllTrips(data)).not.toBe(latest);
    } finally {
      clock.mockRestore();
    }
  });
  it("assigns valid completed trips to K-Means clusters and Decision Tree profiles", () => {
    const data = refreshAllRecommendations(initialData);

    expect(data.analyses).toHaveLength(countAnalyzableCompletedTrips(initialData));
    expect(data.analyses.length).toBeGreaterThanOrEqual(100);
    expect(data.analyses.every((analysis) => analysis.method === "k-means")).toBe(true);
    expect(data.analyses.every((analysis) => analysis.classifier === "decision-tree")).toBe(true);
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("mixed");
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("nature");
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("cultural");
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("urban");
    expect(data.analyses.every((analysis) => analysis.decisionPath.length >= 4)).toBe(true);
    expect(data.analyses.every((analysis) => analysis.decisionTreeDepth >= 2)).toBe(true);
    expect(data.analyses.every((analysis) => analysis.decisionRuleCount >= 2)).toBe(true);
    expect(data.analyses.some((analysis) => analysis.decisionPath.some((step) => step.startsWith("Rule 3")))).toBe(true);
    expect(data.analyses.every((analysis) => analysis.clusterLabel.includes("cluster"))).toBe(true);
    expect(data.analyses.every((analysis) => analysis.clusterDistance >= 0)).toBe(true);
    expect(data.analyses.every((analysis) => Object.values(analysis.clusterCentroid).some((value) => value > 0))).toBe(true);
    expect(data.analyses.every((analysis) => analysis.kMeansInput.culturalProportion + analysis.kMeansInput.natureProportion + analysis.kMeansInput.urbanProportion > 0)).toBe(true);
    expect(data.analyses.every((analysis) => analysis.kMeansInput.uniqueDestinations >= 1)).toBe(true);
    expect(data.analyses.every((analysis) => analysis.kMeansCentroid.culturalProportion + analysis.kMeansCentroid.natureProportion + analysis.kMeansCentroid.urbanProportion > 0)).toBe(
      true
    );
    expect(data.recommendations.some((recommendation) => recommendation.scoreBreakdown.clusterPattern > 0)).toBe(true);
    expect(
      data.recommendations.every((recommendation) => recommendation.score === Math.min(100, Object.values(recommendation.scoreBreakdown).reduce((sum, value) => sum + value, 0)))
    ).toBe(true);
  });

  it("uses recovered groups through trip analysis and keeps silhouette out of ranking", () => {
    const categories = ["cultural", "nature", "urban"] as const;
    const destinations = categories.map((category, index) => ({
      ...initialData.destinations[0], id: category, name: category, category,
      latitude: 0, longitude: 10 + index * 10,
    }));
    const trips = categories.flatMap((category) => Array.from({ length: 4 }, (_, index) => ({
      ...initialData.trips[0], id: `${category}-${index}`,
      userId: "tourist-demo", status: "completed" as const,
    })));
    const points = trips.flatMap((trip) => {
      const dominant = categories.find((category) => trip.id.startsWith(category))!;
      const places = destinations.flatMap((place) => Array.from({ length: place.category === dominant ? 18 : 1 }, () => place));
      return places.map((place, index) => ({
        ...initialData.points[0], id: `${trip.id}-${index}`, tripId: trip.id,
        userId: trip.userId, latitude: place.latitude, longitude: place.longitude,
        source: "demo" as const,
        recordedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
      }));
    });
    const data = { ...initialData, trips, points, destinations };
    const analyses = analyzeAllTrips(data);
    expect(new Set(analyses.map((analysis) => analysis.cluster)).size).toBe(3);
    expect(analyses.every((analysis) => analysis.silhouetteScore === 1)).toBe(true);
    const reversed = analyzeAllTrips({ ...data, trips: [...trips].reverse() });
    for (const analysis of analyses) {
      const repeat = reversed.find((row) => row.tripId === analysis.tripId)!;
      expect(repeat.profile).toBe(analysis.profile);
      expect(repeat.kMeansCentroid).toEqual(analysis.kMeansInput);
    }
    const recommendationData = {
      ...data,
      destinations: [...destinations, { ...destinations[0], id: "unvisited-place", longitude: 40 }],
    };
    const ranking = (silhouetteScore: number) => recommendForUser(
      "tourist-demo", recommendationData, { ...analyses[0], silhouetteScore }
    ).map(({ destinationId, scoreBreakdown }) => ({ destinationId, scoreBreakdown }));
    expect(ranking(0).length).toBeGreaterThan(0);
    expect(ranking(0)).toEqual(ranking(1));
    const onlyTrip = trips[0];
    const only = analyzeAllTrips({ ...data, trips: [onlyTrip], points: points.filter((point) => point.tripId === onlyTrip.id) });
    expect(only).toHaveLength(1);
    expect(only[0].silhouetteScore).toBe(0);
    expect(only[0].cluster).toBe(0);
  });

  it("reports AI evaluation evidence for labelled demo records", () => {
    const evaluation = evaluateAiOutput(initialData);

    expect(evaluation.validClusteredRecordCount).toBe(countAnalyzableCompletedTrips(initialData));
    expect(evaluation.labelledRecordCount).toBeGreaterThanOrEqual(100);
    expect(evaluation.classificationAccuracy).toBeGreaterThan(0.75);
    expect(evaluation.confusionMatrix.mixed.mixed).toBeGreaterThan(0);
    expect(evaluation.confusionMatrix.nature.nature).toBeGreaterThan(0);
    expect(evaluation.confusionMatrix.cultural.cultural).toBeGreaterThan(0);
    expect(evaluation.confusionMatrix.urban.urban).toBeGreaterThan(0);
  });

  it("uses recorded movement as a destination demand signal", () => {
    const demand = calculateDestinationDemand(initialData);
    const top = demand[0];

    expect(top.popularityScore).toBeGreaterThan(0);
    expect(top.movementPointCount).toBeGreaterThan(0);
    expect(top.approachSignalCount).toBeGreaterThanOrEqual(0);
    expect(["high", "medium", "emerging"]).toContain(top.tier);
    expect(getDestinationDemand(initialData, top.destinationId)?.popularityScore).toBe(top.popularityScore);
    expect(getDestinationDemand(initialData, "missing-destination")).toBeNull();
  });

  it("detects destinations tourists are moving toward before arrival", () => {
    const startedAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const approachTrip: TripSession = {
      id: "trip-approach",
      userId: "tourist-demo",
      status: "completed",
      startedAt,
      endedAt: new Date().toISOString(),
      consentId: "consent-demo",
    };
    const approachPoints: MovementPoint[] = [
      {
        id: "approach-point-1",
        tripId: "trip-approach",
        latitude: 3.18,
        longitude: 101.72,
        accuracyMeters: 25,
        recordedAt: startedAt,
        source: "demo",
      },
      {
        id: "approach-point-2",
        tripId: "trip-approach",
        latitude: 3.16,
        longitude: 101.705,
        accuracyMeters: 25,
        recordedAt: new Date().toISOString(),
        source: "demo",
      },
    ];
    const approachData: AppData = {
      ...initialData,
      trips: [...initialData.trips, approachTrip],
      points: [...initialData.points, ...approachPoints],
    };
    const demand = calculateDestinationDemand(approachData);
    const klcc = demand.find((row) => row.destinationId === "klcc-park");

    expect(klcc?.approachSignalCount).toBeGreaterThan(0);
    expect(klcc?.approachingTouristCount).toBeGreaterThan(0);
  });

  it("expires old alerts and opens only trips behind the new activity", () => {
    const now = Date.parse("2026-11-17T12:00:00Z");
    const at = (hoursAgo: number) => new Date(now - hoursAgo * 3600000).toISOString();
    const [first, second] = initialData.destinations;
    const data: AppData = { ...initialData, destinations: [first, second], trips: [], points: [] };
    const track = (place: typeof first, hoursAgo: number, tourist: string, source: MovementPoint["source"] = "browser") => {
      const tripId = `trip-${data.trips.length}`;
      data.trips.push({ id: tripId, userId: tourist, status: "completed", consentId: "consent", startedAt: at(hoursAgo) });
      data.points.push({ id: tripId, tripId, userId: tourist, latitude: place.latitude, longitude: place.longitude, accuracyMeters: 25, recordedAt: at(hoursAgo), source });
      return tripId;
    };

    for (let day = 0; day < 8; day++) {
      for (let tourist = 1; tourist <= 3; tourist++) track(first, 2 + day * 24, `regular-${tourist}`);
    }
    track(second, 29, "baseline");
    const evidence = [track(second, 4, "a"), track(second, 3, "b"), track(second, 2, "c"), track(second, 1, "a")];
    track(second, 1, "sample-a", "demo");
    track(second, 1, "sample-b", "demo");
    const alerts = calculateMovementAlerts(data, now);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ destinationId: second.id, severity: "watch", recentTouristCount: 3, baselineDailyAverage: 1 / 7, source: "browser" });
    expect(alerts[0].tripIds).toEqual(evidence);
    expect(buildMovementAlertsCsv(alerts, data)).toContain('"gps","3","0.14"');
    const history = getMovementDashboardViews(data, { tripIds: new Set(alerts[0].tripIds) });
    expect(new Set(history.tripRecords.map((record) => record.trip.id))).toEqual(new Set(evidence));
    expect(new Set(history.records.map((record) => record.point.tripId))).toEqual(new Set(evidence));
    expect(calculateMovementAlerts(data, now + 86400000)).toEqual([]);

    for (const tourist of ["d", "e", "f", "g", "h", "i", "j"]) track(first, -24, tourist);
    expect(calculateMovementAlerts(data, now + 25 * 3600000).map((alert) => alert.destinationId)).toEqual([first.id]);
  });

  it("keeps sample and recorded tourists separate", () => {
    const now = Date.parse("2026-11-17T12:00:00Z");
    const recordedAt = new Date(now - 3600000).toISOString();
    const [place] = initialData.destinations;
    const trips = Array.from({ length: 4 }, (_, index): TripSession =>
      ({ id: `trip-${index}`, userId: `tourist-${index}`, status: "completed", consentId: "consent", startedAt: recordedAt }));
    const points = trips.map((trip, index): MovementPoint =>
      ({ id: trip.id, tripId: trip.id, latitude: place.latitude, longitude: place.longitude, accuracyMeters: 25, recordedAt, source: index < 3 ? "demo" : "browser" }));
    expect(calculateMovementAlerts({ ...initialData, trips, points, destinations: [place] }, now)).toEqual([
      expect.objectContaining({ source: "demo", recentTouristCount: 3, tripIds: trips.slice(0, 3).map((trip) => trip.id) }),
    ]);
  });

  it("creates a travel plan from tourist movement hotspots", () => {
    const plan = createMovementBasedTravelPlan(initialData);

    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.stops[0].order).toBe(1);
    expect(plan.summary).toContain("movement");
  });

  it("creates configurable travel plans for tourism administrators", () => {
    const plan = createMovementBasedTravelPlan(initialData, {
      audience: "nature",
      city: "Penang",
      maxStops: 2,
      minimumTier: "low",
      diversifyCategories: false,
    });
    const planDestinations = plan.stops.map((stop) => initialData.destinations.find((destination) => destination.id === stop.destinationId));

    expect(plan.criteria.audience).toBe("nature");
    expect(plan.criteria.city).toBe("Penang");
    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.stops.length).toBeLessThanOrEqual(2);
    expect(planDestinations.every((destination) => destination?.city === "Penang")).toBe(true);
    expect(plan.summary).toContain("nature");
  });

  it("exports the movement-based travel plan as CSV", () => {
    const plan = createMovementBasedTravelPlan(initialData);
    const csv = buildTravelPlanCsv(plan, initialData);

    expect(csv).toContain('"order","destination","city"');
    expect(csv).toContain('"suggested_minutes"');
    expect(csv.split("\n").length).toBe(plan.stops.length + 1);
  });

  it("falls back without misleading personalization when a tourist has insufficient movement data", () => {
    const sparseTrip: TripSession = {
      id: "trip-sparse",
      userId: "tourist-demo",
      status: "completed",
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      consentId: "consent-demo",
    };
    const sparseData: AppData = {
      ...initialData,
      trips: [sparseTrip],
      points: [],
      analyses: [],
      recommendations: [],
    };

    const recommendations = recommendForUser("tourist-demo", sparseData);

    expect(recommendations).toHaveLength(3);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].reason).toContain("Basic suggestion");
    expect(recommendations[0].reason).not.toContain("Matches the");
    expect(recommendations[0].scoreBreakdown.profileFit).toBeGreaterThan(0);
    expect(recommendations[0].scoreBreakdown.clusterPattern).toBe(0);
    expect(recommendations[0].scoreBreakdown.movementDemand).toBeGreaterThanOrEqual(0);
    expect(recommendations[0].scoreBreakdown.proximity).toBeGreaterThan(0);
    expect(recommendations[0].scoreBreakdown.unvisited).toBe(20);
  });

  it("prioritizes nearby destinations when the tourist has a current location", () => {
    const recommendations = recommendForUser("tourist-demo", refreshAllRecommendations(initialData), undefined, undefined, {
      latitude: 5.4141,
      longitude: 100.3288,
      recordedAt: new Date().toISOString(),
    });
    const recommendedDestinations = recommendations.map((recommendation) =>
      initialData.destinations.find((destination) => destination.id === recommendation.destinationId)
    );

    expect(recommendedDestinations[0]?.city).toBe("Penang");
    expect(recommendedDestinations.every((destination) => destination?.city === "Penang")).toBe(true);
  });

  it("keeps saved-route suggestions local even when account history points elsewhere", () => {
    const data = refreshAllRecommendations(initialData);
    const recommendations = recommendForUser("tourist-demo", data, undefined, undefined, {
      latitude: 5.4141, longitude: 100.3288, recordedAt: "2026-01-01T00:00:00Z",
    }, { localOnly: true, radiusKm: 25, ignoreHistoryLocation: true });
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((recommendation) => data.destinations.find((place) => place.id === recommendation.destinationId)?.city === "Penang")).toBe(true);
  });

  it("uses distance for local score ties and catalogue order for nationwide ties", () => {
    const point = { latitude: 5.4141, longitude: 100.3288, recordedAt: "2026-10-30T12:00:00Z" };
    const base = initialData.destinations[0];
    const destinations = [
      { ...base, id: "furthest", latitude: point.latitude + 0.020, longitude: point.longitude },
      { ...base, id: "near-fallback", latitude: point.latitude + 0.015, longitude: point.longitude },
      { ...base, id: "local-b", latitude: point.latitude + 0.005, longitude: point.longitude },
      { ...base, id: "local-a", latitude: point.latitude + 0.003, longitude: point.longitude },
    ];
    const data = { ...initialData, destinations, trips: [], points: [], checkIns: [] };
    const ids = (radiusKm: number) => recommendForUser("new-tourist", data, undefined, [], point, { radiusKm })
      .map((recommendation) => recommendation.destinationId);

    expect(ids(1)).toEqual(["local-a", "local-b", "near-fallback"]);
    expect(ids(0)).toEqual(["furthest", "near-fallback", "local-b"]);
  });

  it("keeps fallback recommendations nearest-first when only one local destination is available", () => {
    const penangPoint = {
      latitude: 5.4141,
      longitude: 100.3288,
      recordedAt: new Date().toISOString(),
    };
    const sparseMalaysiaData: AppData = {
      ...initialData,
      trips: [],
      points: [],
      analyses: [],
      recommendations: [],
      destinations: initialData.destinations.filter((destination) => destination.city !== "Penang" || destination.id === "penang-hill"),
    };

    const recommendations = recommendForUser("tourist-new", sparseMalaysiaData, undefined, [], penangPoint);
    const recommendedDestinations = recommendations.map((recommendation) =>
      sparseMalaysiaData.destinations.find((destination) => destination.id === recommendation.destinationId)
    );

    expect(recommendedDestinations[0]?.id).toBe("penang-hill");
    expect(recommendedDestinations.slice(0, 2).map((destination) => destination?.city)).not.toContain("Kuala Lumpur");
  });
});
