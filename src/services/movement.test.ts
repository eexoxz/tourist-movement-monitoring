import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData } from "../types";
import {
  appendMovementPoint,
  deleteTouristMovementData,
  getActiveTrip,
  getGrantedConsent,
  getVisitedDestinationIds,
  grantLocationConsent,
  revokeLocationConsent,
  startTripSession,
  stopActiveTrip,
  summarizeTrip,
  summarizeUserTrips,
} from "./movement";

describe("movement service", () => {
  it("requires consent before starting a trip", () => {
    const data: AppData = {
      ...initialData,
      consents: initialData.consents.filter((consent) => consent.userId !== "tourist-demo"),
      trips: initialData.trips.filter((trip) => trip.userId !== "tourist-demo"),
    };

    const result = startTripSession(data, "tourist-demo");

    expect(result.error).toContain("consent");
  });

  it("grants consent and starts one active trip", () => {
    const withConsent = grantLocationConsent(initialData, "tourist-demo");
    const result = startTripSession(
      {
        ...withConsent,
        trips: withConsent.trips.filter((trip) => trip.userId !== "tourist-demo"),
      },
      "tourist-demo"
    );

    expect(getGrantedConsent(withConsent, "tourist-demo")?.granted).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.trip?.status).toBe("active");
    expect(result.data?.trips.some((trip) => trip.id === result.trip?.id)).toBe(true);
  });

  it("prevents duplicate active trip sessions", () => {
    const first = startTripSession(
      {
        ...initialData,
        trips: initialData.trips.filter((trip) => trip.userId !== "tourist-demo"),
      },
      "tourist-demo"
    );
    const second = startTripSession(first.data!, "tourist-demo");

    expect(second.error).toContain("already");
  });

  it("validates movement coordinates before saving a point", () => {
    const started = startTripSession(
      {
        ...initialData,
        trips: initialData.trips.filter((trip) => trip.userId !== "tourist-demo"),
      },
      "tourist-demo"
    );

    const invalid = appendMovementPoint(started.data!, {
      tripId: started.trip!.id,
      latitude: 123,
      longitude: 101.7,
      accuracyMeters: 0,
      source: "demo",
    });
    const valid = appendMovementPoint(started.data!, {
      tripId: started.trip!.id,
      latitude: 3.1478,
      longitude: 101.6937,
      accuracyMeters: 0,
      source: "demo",
    });

    expect(invalid.error).toContain("valid latitude");
    expect(valid.error).toBeUndefined();
    expect(valid.point?.accuracyMeters).toBe(25);
    expect(valid.data?.points.some((point) => point.id === valid.point?.id)).toBe(true);
  });

  it("filters duplicate movement points recorded too close together", () => {
    const activeData: AppData = {
      ...initialData,
      trips: [
        ...initialData.trips,
        {
          id: "trip-active",
          userId: "tourist-demo",
          status: "active",
          startedAt: new Date().toISOString(),
          consentId: "consent-demo",
        },
      ],
      points: [
        ...initialData.points,
        {
          id: "point-active-1",
          tripId: "trip-active",
          latitude: 3.1478,
          longitude: 101.6937,
          accuracyMeters: 25,
          recordedAt: new Date().toISOString(),
          source: "demo",
        },
      ],
    };

    const duplicate = appendMovementPoint(activeData, {
      tripId: "trip-active",
      latitude: 3.14781,
      longitude: 101.69371,
      accuracyMeters: 25,
      source: "demo",
    });

    expect(duplicate.error).toContain("too close");
  });

  it("stops an active trip and records completion", () => {
    const started = startTripSession(
      {
        ...initialData,
        trips: initialData.trips.filter((trip) => trip.userId !== "tourist-demo"),
      },
      "tourist-demo"
    );
    const stopped = stopActiveTrip(started.data!, "tourist-demo");

    expect(stopped.error).toBeUndefined();
    expect(getActiveTrip(stopped.data!, "tourist-demo")).toBeNull();
    expect(stopped.data?.trips.find((trip) => trip.id === started.trip?.id)?.endedAt).toBeTruthy();
  });

  it("recovers an active trip from stored data after a reload", () => {
    const activeData: AppData = {
      ...initialData,
      trips: [
        ...initialData.trips,
        {
          id: "trip-recovered",
          userId: "tourist-demo",
          status: "active",
          startedAt: new Date().toISOString(),
          consentId: "consent-demo",
        },
      ],
    };

    expect(getActiveTrip(activeData, "tourist-demo")?.id).toBe("trip-recovered");
  });

  it("revokes consent and ends active tracking", () => {
    const started = startTripSession(
      {
        ...initialData,
        trips: initialData.trips.filter((trip) => trip.userId !== "tourist-demo"),
      },
      "tourist-demo"
    );
    const revoked = revokeLocationConsent(started.data!, "tourist-demo");

    expect(getGrantedConsent(revoked, "tourist-demo")).toBeNull();
    expect(getActiveTrip(revoked, "tourist-demo")).toBeNull();
  });

  it("deletes one tourist movement records without deleting other tourists", () => {
    const cleaned = deleteTouristMovementData(initialData, "tourist-demo");

    expect(cleaned.trips.some((trip) => trip.userId === "tourist-demo")).toBe(false);
    expect(cleaned.points.some((point) => point.tripId === "trip-demo-1")).toBe(false);
    expect(cleaned.trips.some((trip) => trip.userId === "tourist-nature-demo")).toBe(true);
  });

  it("detects destinations already visited from tourist movement records", () => {
    const visited = getVisitedDestinationIds(initialData, "tourist-demo");

    expect(visited.has("islamic-arts-museum")).toBe(true);
    expect(visited.has("central-market")).toBe(true);
    expect(visited.has("merdeka-square")).toBe(true);
    expect(visited.has("klcc-park")).toBe(true);
    expect(visited.has("penang-hill")).toBe(false);
  });

  it("summarizes route distance, duration, accuracy, and visited destinations", () => {
    const summary = summarizeTrip(initialData, "trip-demo-1");
    const userSummaries = summarizeUserTrips(initialData, "tourist-demo");

    expect(summary.pointCount).toBe(4);
    expect(summary.distanceKm).toBeGreaterThan(0);
    expect(summary.durationMinutes).toBeGreaterThan(0);
    expect(summary.averageAccuracyMeters).toBeGreaterThan(0);
    expect(summary.visitedDestinationCount).toBe(4);
    expect(userSummaries).toHaveLength(1);
    expect(userSummaries[0].tripId).toBe("trip-demo-1");
  });
});
