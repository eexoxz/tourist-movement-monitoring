import { describe, expect, it } from "vitest";
import { createStarterDemoData, demoDatasetMetadata, getPreparedDemoTouristCount, initialData, isPreparedDemoDatasetLoaded, isSampleTourist, mergePreparedDemoDataset, refreshLegacyDemoProfiles, removeGeneratedDemoDataset } from "./demoData";
import { distanceKm } from "../services/geo";

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
    expect(generatedTrips.length).toBeGreaterThanOrEqual(demoDatasetMetadata.generatedTouristCount);
    expect(generatedTrips.length).toBeLessThanOrEqual(demoDatasetMetadata.generatedTouristCount * demoDatasetMetadata.maxTripsPerTourist);
    expect(generatedPoints.length).toBeGreaterThanOrEqual(generatedTrips.length * 4);
    expect(generatedPoints.length).toBeLessThanOrEqual(generatedTrips.length * demoDatasetMetadata.maxPointsPerTrip);
    expect(generatedCheckIns.length).toBeGreaterThanOrEqual(generatedTrips.length);
    expect(generatedCheckIns.length).toBeLessThanOrEqual(generatedTrips.length * demoDatasetMetadata.maxCheckInsPerTrip);
    expect(new Set(generatedUsers.map((user) => generatedTrips.filter((trip) => trip.userId === user.id).length)).size).toBe(3);
    expect(destinationsWithGeneratedMovement.size).toBe(initialData.destinations.length);
  });

  it("detects, removes, and restores generated demo tourists without touching base records", () => {
    const cleaned = removeGeneratedDemoDataset(initialData);
    const restored = mergePreparedDemoDataset(cleaned, demoDatasetMetadata.generatedTouristCount);

    expect(isPreparedDemoDatasetLoaded(initialData)).toBe(true);
    expect(isPreparedDemoDatasetLoaded(cleaned)).toBe(false);
    expect(cleaned.users.some((user) => user.id === "tourist-demo")).toBe(true);
    expect(cleaned.users.some((user) => user.id.startsWith("tourist-seed-"))).toBe(false);
    expect(cleaned.trips.some((trip) => trip.id.startsWith("trip-seed-"))).toBe(false);
    expect(cleaned.points.some((point) => point.id.startsWith("point-seed-"))).toBe(false);
    expect(isPreparedDemoDatasetLoaded(restored)).toBe(true);
  });

  it("loads twenty tourists at a time and stops at the fixed maximum", () => {
    let data = removeGeneratedDemoDataset(initialData);
    for (let batch = 1; batch <= 8; batch++) {
      data = mergePreparedDemoDataset(data);
      expect(getPreparedDemoTouristCount(data)).toBe(Math.min(batch * 20, 100));
      const users = new Set(data.users.map((user) => user.id));
      expect(users.size).toBe(data.users.length);
      expect(data.trips.every((trip) => users.has(trip.userId))).toBe(true);
      const trips = new Set(data.trips.map((trip) => trip.id));
      expect(data.points.every((point) => trips.has(point.tripId))).toBe(true);
      expect(data.checkIns.every((visit) => users.has(visit.userId) && (!visit.tripId || trips.has(visit.tripId)))).toBe(true);
    }
    expect(isPreparedDemoDatasetLoaded(data)).toBe(true);
    expect(getPreparedDemoTouristCount(createStarterDemoData())).toBe(20);
    expect(() => mergePreparedDemoDataset(data, Number.NaN)).toThrow();
    expect(() => mergePreparedDemoDataset(data, 101)).toThrow();
  });

  it("provides distinct fictional names and independently varied travel profiles", () => {
    const users = initialData.users.filter((user) => user.id.startsWith("tourist-seed-"));
    expect(new Set(users.map((user) => user.name)).size).toBe(100);
    expect(new Set(users.map((user) => user.email)).size).toBe(100);
    expect(new Set(users.map((user) => user.nationality)).size).toBe(13);
    expect(users.every((user) => !/demo tourist/i.test(user.name) && user.email.endsWith("@example.com") && !user.emergencyContactPhone)).toBe(true);
    for (const nationality of new Set(users.map((user) => user.nationality))) {
      const group = users.filter((user) => user.nationality === nationality);
      expect(new Set(group.map((user) => user.expectedProfile)).size).toBe(4);
      expect(group.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("upgrades only legacy sample identities and preserves customised or authenticated accounts", () => {
    const generated = initialData.users.find((user) => user.id === "tourist-seed-001")!;
    const legacy = { ...generated, name: "Demo Tourist 001" };
    const authenticated = { ...legacy, authUid: "real-auth-uid" };
    const custom = { ...generated, name: "My customised traveller" };
    const real = { ...legacy, id: "registered-tourist" };
    const upgraded = refreshLegacyDemoProfiles([legacy, authenticated, custom, real]);
    expect(upgraded[0].name).toBe(generated.name);
    expect(upgraded[1]).toBe(authenticated);
    expect(upgraded[2]).toBe(custom);
    expect(upgraded[3]).toBe(real);
    expect(isSampleTourist(authenticated)).toBe(false);
  });

  it("removes sample safety records but protects authenticated owners and real data", () => {
    const generated = initialData.users.find((user) => user.id === "tourist-seed-001")!;
    const protectedUser = { ...generated, authUid: "registered-user" };
    const sampleOwner = "tourist-seed-002";
    const sampleSos = { ...initialData.sosAlerts[0], id: "sample-sos", userId: sampleOwner };
    const sampleIncident = { ...initialData.incidentReports[0], id: "sample-incident", userId: sampleOwner };
    const data = { ...initialData, users: initialData.users.map((user) => user.id === protectedUser.id ? protectedUser : user), sosAlerts: [...initialData.sosAlerts, sampleSos], incidentReports: [...initialData.incidentReports, sampleIncident] };
    const cleaned = removeGeneratedDemoDataset(data);
    expect(cleaned.users).toContain(protectedUser);
    expect(cleaned.trips.filter((trip) => trip.userId === protectedUser.id)).toEqual(data.trips.filter((trip) => trip.userId === protectedUser.id));
    expect(cleaned.points.filter((point) => point.userId === protectedUser.id)).toEqual(data.points.filter((point) => point.userId === protectedUser.id));
    expect(cleaned.sosAlerts).toEqual(initialData.sosAlerts);
    expect(cleaned.incidentReports).toEqual(initialData.incidentReports);
    expect(cleaned.destinations).toBe(data.destinations);
  });

  it("keeps generated visits inside their trip and in chronological order", () => {
    const trips = new Map(initialData.trips.map((trip) => [trip.id, trip]));
    const byUserTrip = new Map<string, typeof initialData.checkIns>();
    for (const visit of initialData.checkIns.filter((record) => record.id.startsWith("checkin-seed-"))) {
      const trip = trips.get(visit.tripId!)!;
      expect(Date.parse(visit.checkedInAt)).toBeGreaterThanOrEqual(Date.parse(trip.startedAt));
      expect(Date.parse(visit.checkedOutAt!)).toBeGreaterThan(Date.parse(visit.checkedInAt));
      expect(Date.parse(visit.checkedOutAt!)).toBeLessThanOrEqual(Date.parse(trip.endedAt!));
      const earlier = byUserTrip.get(trip.id) ?? [];
      expect(earlier.every((record) => Date.parse(record.checkedOutAt!) <= Date.parse(visit.checkedInAt))).toBe(true);
      byUserTrip.set(trip.id, [...earlier, visit]);
    }
    for (const point of initialData.points.filter((record) => record.id.startsWith("point-seed-"))) {
      const trip = trips.get(point.tripId)!;
      expect(Date.parse(point.recordedAt)).toBeGreaterThanOrEqual(Date.parse(trip.startedAt));
      expect(Date.parse(point.recordedAt)).toBeLessThanOrEqual(Date.parse(trip.endedAt!));
      expect(point.source).toBe("demo");
    }
    const previousByTrip = new Map<string, typeof initialData.points[number]>();
    for (const point of initialData.points.filter((record) => record.id.startsWith("point-seed-"))) {
      const previous = previousByTrip.get(point.tripId);
      if (previous) {
        expect(distanceKm(previous, point)).toBeLessThan(180);
        expect(Date.parse(point.recordedAt)).toBeGreaterThan(Date.parse(previous.recordedAt));
      }
      previousByTrip.set(point.tripId, point);
    }
  });
});
