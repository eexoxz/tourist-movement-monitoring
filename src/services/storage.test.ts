import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { clearSession, createId, FIRESTORE_COLLECTIONS, loadData, loadSession, normalizeAppData, saveSession } from "./storage";

describe("storage service", () => {
  it("uses DPP-aligned Firestore collection names for new writes", () => {
    expect(Object.values(FIRESTORE_COLLECTIONS)).toEqual(
      expect.arrayContaining([
        "users",
        "tourist_profiles",
        "tourist_preferences",
        "location_consents",
        "trip_sessions",
        "movement_records",
        "destination_categories",
        "destinations",
        "ai_analyses",
        "recommendations",
      ])
    );
  });

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
      trips: [
        {
          id: "trip-old",
          userId: "tourist-old",
          status: "completed",
          startedAt: "2026-08-01T00:00:00.000Z",
          endedAt: "2026-08-01T02:00:00.000Z",
          consentId: "consent-old",
        },
      ],
      points: [
        {
          id: "point-old",
          tripId: "trip-old",
          latitude: 3.1556,
          longitude: 101.7139,
          accuracyMeters: 25,
          recordedAt: "2026-08-01T01:00:00.000Z",
          source: "demo",
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
    expect(normalized.analyses[0].kMeansInput.uniqueDestinations).toBe(0);
    expect(normalized.analyses[0].kMeansCentroid.urbanProportion).toBe(0);
    expect(normalized.points[0].userId).toBe("tourist-old");
  });

  it("creates ids when randomUUID is unavailable on LAN preview origins", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        return bytes;
      },
    });

    expect(createId("point")).toBe("point-0102030405060708090a0b0c0d0e0f10");
    vi.unstubAllGlobals();
  });

  it("keeps a saved user session available across reloads", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    saveSession("user-123");
    expect(loadSession()).toBe("user-123");
    clearSession();
    expect(loadSession()).toBeNull();
    vi.unstubAllGlobals();
  });

  it("restores the prepared dataset when browser storage has been cleared", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    const data = loadData();

    expect(data.users.length).toBeGreaterThanOrEqual(initialData.users.length);
    expect(data.destinations).toHaveLength(initialData.destinations.length);
    expect(data.trips.length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
