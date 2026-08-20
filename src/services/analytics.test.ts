import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData, TripSession } from "../types";
import {
  calculateDestinationDemand,
  createMovementBasedTravelPlan,
  evaluateAiOutput,
  recommendForUser,
  refreshAllRecommendations,
} from "./analytics";

describe("analytics service", () => {
  it("assigns valid completed trips to K-Means clusters and Decision Tree profiles", () => {
    const data = refreshAllRecommendations(initialData);

    expect(data.analyses).toHaveLength(2);
    expect(data.analyses.every((analysis) => analysis.method === "k-means")).toBe(true);
    expect(data.analyses.every((analysis) => analysis.classifier === "decision-tree")).toBe(true);
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("mixed");
    expect(data.analyses.map((analysis) => analysis.profile)).toContain("nature");
    expect(data.analyses.every((analysis) => analysis.decisionPath.length >= 4)).toBe(true);
  });

  it("reports AI evaluation evidence for labelled demo records", () => {
    const evaluation = evaluateAiOutput(initialData);

    expect(evaluation.validClusteredRecordCount).toBe(2);
    expect(evaluation.labelledRecordCount).toBe(2);
    expect(evaluation.classificationAccuracy).toBe(1);
    expect(evaluation.confusionMatrix.mixed.mixed).toBe(1);
    expect(evaluation.confusionMatrix.nature.nature).toBe(1);
  });

  it("uses recorded movement as a destination demand signal", () => {
    const demand = calculateDestinationDemand(initialData);
    const top = demand[0];

    expect(top.popularityScore).toBeGreaterThan(0);
    expect(top.movementPointCount).toBeGreaterThan(0);
    expect(["high", "medium", "emerging"]).toContain(top.tier);
  });

  it("creates a travel plan from tourist movement hotspots", () => {
    const plan = createMovementBasedTravelPlan(initialData);

    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.stops[0].order).toBe(1);
    expect(plan.summary).toContain("movement");
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

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].reason).toContain("Fallback suggestion");
  });
});
