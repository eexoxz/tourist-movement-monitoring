import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData } from "../types";
import {
  appendMovementPoint,
  deleteTouristMovementData,
  getActiveTrip,
  getGrantedConsent,
  grantLocationConsent,
  revokeLocationConsent,
  startTripSession,
  stopActiveTrip,
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
});
