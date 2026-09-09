import { describe, expect, it } from "vitest";
import { demoDatasetMetadata, initialData, isPreparedDemoDatasetLoaded, mergePreparedDemoDataset, removeGeneratedDemoDataset } from "./demoData";

describe("generated demo dataset", () => {
  it("creates regional tourist movement records for every saved destination", () => {
    const generatedUsers = initialData.users.filter((user) => user.id.startsWith("tourist-seed-"));
    const generatedTrips = initialData.trips.filter((trip) => trip.id.startsWith("trip-seed-"));
    const generatedPoints = initialData.points.filter((point) => point.id.startsWith("point-seed-"));
    const generatedCheckIns = initialData.checkIns.filter((checkIn) => checkIn.id.startsWith("checkin-seed-"));
    const destinationsWithGeneratedMovement = new Set(
      generatedPoints.flatMap((point) => {
        const matchingDestination = initialData.destinations.find(
          (destination) => Math.abs(destination.latitude - point.latitude) < 0.002 && Math.abs(destination.longitude - point.longitude) < 0.002
        );

        return matchingDestination ? [matchingDestination.id] : [];
      })
    );

    expect(generatedUsers).toHaveLength(demoDatasetMetadata.generatedTouristCount);
    expect(generatedTrips).toHaveLength(demoDatasetMetadata.generatedTouristCount * demoDatasetMetadata.generatedTripsPerTourist);
    expect(generatedPoints).toHaveLength(generatedTrips.length * demoDatasetMetadata.generatedPointsPerTrip);
    expect(generatedCheckIns.length).toBeGreaterThanOrEqual(generatedTrips.length);
    expect(destinationsWithGeneratedMovement.size).toBe(initialData.destinations.length);
  });

  it("detects, removes, and restores generated demo tourists without touching base records", () => {
    const cleaned = removeGeneratedDemoDataset(initialData);
    const restored = mergePreparedDemoDataset(cleaned);

    expect(isPreparedDemoDatasetLoaded(initialData)).toBe(true);
    expect(isPreparedDemoDatasetLoaded(cleaned)).toBe(false);
    expect(cleaned.users.some((user) => user.id === "tourist-demo")).toBe(true);
    expect(cleaned.users.some((user) => user.id.startsWith("tourist-seed-"))).toBe(false);
    expect(cleaned.trips.some((trip) => trip.id.startsWith("trip-seed-"))).toBe(false);
    expect(cleaned.points.some((point) => point.id.startsWith("point-seed-"))).toBe(false);
    expect(isPreparedDemoDatasetLoaded(restored)).toBe(true);
  });
});
