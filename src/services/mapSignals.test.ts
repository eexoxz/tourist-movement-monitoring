import { describe, expect, it } from "vitest";
import type { Destination, DestinationDemand, MovementPoint } from "../types";
import { calculateDestinationSignals } from "./mapSignals";

const destination: Destination = {
  id: "george-town",
  name: "George Town Heritage Zone",
  category: "heritage",
  latitude: 5.4141,
  longitude: 100.3288,
  city: "Penang",
  description: "Heritage streets and cultural activity.",
  averageVisitMinutes: 90,
};

const farDestination: Destination = {
  id: "klcc",
  name: "KLCC Park",
  category: "urban",
  latitude: 3.1587,
  longitude: 101.7131,
  city: "Kuala Lumpur",
  description: "Urban park near KLCC.",
  averageVisitMinutes: 75,
};

function point(id: string, latitude: number, longitude: number, userId: string, recordedAt: string): MovementPoint {
  return {
    id,
    tripId: `trip-${userId}`,
    userId,
    latitude,
    longitude,
    accuracyMeters: 20,
    recordedAt,
    source: "demo",
  };
}

describe("map signal service", () => {
  it("shows a shared activity band without inventing visitor or GPS counts", () => {
    const demand: DestinationDemand = { destinationId: destination.id, popularityScore: 80, tier: "high", movementPointCount: 0, uniqueTouristCount: 0, recentPointCount: 0, approachSignalCount: 0, approachingTouristCount: 0 };
    expect(calculateDestinationSignals([destination], [], undefined, [demand]).get(destination.id)).toMatchObject({ tier: "high", activityScore: 80, nearbyPointCount: 0, uniqueTouristCount: 0 });
    expect(calculateDestinationSignals([destination], [], undefined, [{ ...demand, tier: "low", popularityScore: 0 }]).get(destination.id)?.tier).toBe("low");
  });
  it("counts nearby movement points without treating faraway points as demand", () => {
    const signals = calculateDestinationSignals(
      [destination, farDestination],
      [
        point("near-1", 5.4142, 100.3289, "tourist-a", "2026-09-01T10:00:00.000Z"),
        point("near-2", 5.4143, 100.329, "tourist-a", "2026-09-01T10:10:00.000Z"),
        point("near-3", 5.4139, 100.3287, "tourist-b", "2026-09-01T10:20:00.000Z"),
        point("far-1", 4.6, 101.1, "tourist-c", "2026-09-01T10:30:00.000Z"),
      ]
    );

    expect(signals.get("george-town")).toMatchObject({
      nearbyPointCount: 3,
      uniqueTouristCount: 2,
      latestRecordedAt: "2026-09-01T10:20:00.000Z",
      tier: "emerging",
    });
    expect(signals.get("klcc")).toMatchObject({
      nearbyPointCount: 0,
      uniqueTouristCount: 0,
      tier: "low",
    });
  });

  it("keeps distance from the active point for the selected place panel", () => {
    const activePoint = point("active", 5.4141, 100.3288, "tourist-a", "2026-09-01T11:00:00.000Z");
    const signal = calculateDestinationSignals([destination], [], activePoint).get("george-town");

    expect(signal?.distanceFromActiveKm).toBeLessThan(0.01);
  });
});
