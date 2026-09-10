import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AnalysisResult } from "../types";
import { getTouristManagementRows } from "./touristManagement";

describe("tourist management service", () => {
  it("summarizes tourist profile, movement, check-in, and safety records", () => {
    const rows = getTouristManagementRows(initialData);
    const culturalDemo = rows.find((row) => row.tourist.id === "tourist-cultural-demo");

    expect(rows.length).toBeGreaterThanOrEqual(300);
    expect(culturalDemo?.completedTrips).toBeGreaterThan(0);
    expect(culturalDemo?.checkIns).toBeGreaterThan(0);
    expect(culturalDemo?.openSafetyCases).toBeGreaterThan(0);
    expect(culturalDemo?.latestDestinationNames.length).toBeGreaterThan(0);
  });

  it("keeps admin users out of tourist management rows", () => {
    const rows = getTouristManagementRows(initialData);

    expect(rows.some((row) => row.tourist.role === "admin")).toBe(false);
  });

  it("counts movement points through trip ownership when point user id is missing", () => {
    const destination = initialData.destinations[0];
    const tourist = {
      id: "tourist-owner-index",
      name: "Owner Index Tourist",
      email: "owner-index@example.com",
      password: "",
      role: "tourist" as const,
      createdAt: "2026-09-01T07:00:00.000Z",
    };
    const data = {
      ...initialData,
      users: [...initialData.users, tourist],
      trips: [
        ...initialData.trips,
        {
          id: "trip-owner-index",
          userId: tourist.id,
          status: "completed" as const,
          startedAt: "2026-09-01T08:00:00.000Z",
          endedAt: "2026-09-01T08:20:00.000Z",
          consentId: "consent-owner-index",
        },
      ],
      points: [
        ...initialData.points,
        {
          id: "point-owner-index",
          tripId: "trip-owner-index",
          latitude: destination.latitude,
          longitude: destination.longitude,
          accuracyMeters: 8,
          recordedAt: "2026-09-01T08:05:00.000Z",
          source: "demo" as const,
        },
      ],
    };

    const row = getTouristManagementRows(data).find((candidate) => candidate.tourist.id === tourist.id);

    expect(row?.movementPoints).toBeGreaterThan(0);
    expect(row?.latestDestinationNames).toContain(destination.name);
  });

  it("uses the latest AI profile without sorting analyses per tourist", () => {
    const tourist = initialData.users.find((user) => user.role === "tourist")!;
    const baseAnalysis: AnalysisResult = {
      tripId: "trip-analysis-index",
      userId: tourist.id,
      cluster: 0,
      profile: "nature",
      classifier: "decision-tree",
      classificationConfidence: 0.7,
      decisionTreeDepth: 2,
      decisionRuleCount: 4,
      decisionPath: ["nature > cultural"],
      silhouetteScore: 0.42,
      clusterDistance: 0.2,
      clusterLabel: "Nature-led route",
      kMeansInput: { culturalProportion: 0, natureProportion: 1, urbanProportion: 0, uniqueDestinations: 1 },
      kMeansCentroid: { culturalProportion: 0, natureProportion: 1, urbanProportion: 0, uniqueDestinations: 1 },
      clusterCentroid: { cultural: 0, nature: 1, urban: 0, heritage: 0, food: 0, coastal: 0 },
      categoryCounts: { cultural: 0, nature: 1, urban: 0, heritage: 0, food: 0, coastal: 0 },
      dataPointCount: 4,
      method: "k-means",
      generatedAt: "2026-09-01T08:00:00.000Z",
    };
    const data = {
      ...initialData,
      analyses: [
        ...initialData.analyses.filter((analysis) => analysis.userId !== tourist.id),
        baseAnalysis,
        { ...baseAnalysis, profile: "urban" as const, generatedAt: "2026-09-02T08:00:00.000Z" },
      ],
    };

    const row = getTouristManagementRows(data).find((candidate) => candidate.tourist.id === tourist.id);

    expect(row?.profile).toBe("urban");
  });
});
