import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { normalizeAppData } from "./storage";

describe("storage service", () => {
  it("normalizes older prototype data into the current app shape", () => {
    const legacyData = {
      users: [
        {
          id: "tourist-old",
          name: "Old Tourist",
          email: "old@example.com",
          password: "",
          role: "tourist",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      recommendations: [
        {
          id: "recommendation-old",
          userId: "tourist-old",
          destinationId: "klcc-park",
          score: 74,
          reason: "Older recommendation record.",
          generatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      analyses: [
        {
          tripId: "trip-old",
          userId: "tourist-old",
          cluster: 1,
          profile: "urban",
          classifier: "decision-tree",
          decisionPath: ["Older decision output."],
          silhouetteScore: 0.5,
          categoryCounts: {
            cultural: 0,
            nature: 0,
            urban: 2,
            heritage: 0,
            food: 1,
            coastal: 0,
          },
          dataPointCount: 3,
          method: "k-means",
          generatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    };

    const normalized = normalizeAppData(legacyData as Parameters<typeof normalizeAppData>[0]);

    expect(normalized.destinations).toHaveLength(initialData.destinations.length);
    expect(normalized.recommendations[0].scoreBreakdown.clusterPattern).toBe(0);
    expect(normalized.recommendations[0].scoreBreakdown.unvisited).toBe(0);
    expect(normalized.analyses[0].clusterLabel).toBe("Unlabelled movement cluster");
    expect(normalized.analyses[0].decisionTreeDepth).toBe(0);
    expect(normalized.analyses[0].clusterCentroid.urban).toBe(0);
  });
});
