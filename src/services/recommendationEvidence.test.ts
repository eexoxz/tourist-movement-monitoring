import { describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import type { AppData, MovementPoint } from "../types";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { getRecordedStopIds } from "./stopEvidence";
import { getRecommendationEvidence } from "./recommendationEvidence";

describe("recommendation evidence index", () => {
  it("matches the original per-tourist history scan for every sample tourist", () => {
    const data = { ...initialData, points: [...initialData.points] };
    const index = createDestinationSpatialIndex(data.destinations);
    for (const user of data.users.filter((record) => record.role === "tourist")) {
      const trips = data.trips.filter((trip) => trip.userId === user.id);
      const owned = new Set(trips.map((trip) => trip.id));
      const completed = new Set(trips.filter((trip) => trip.status === "completed").map((trip) => trip.id));
      const points = data.points.filter((point) => owned.has(point.tripId));
      const visited = getRecordedStopIds(points.filter((point) => completed.has(point.tripId)), index);
      data.checkIns.filter((record) => record.userId === user.id && record.destinationId).forEach((record) => visited.add(record.destinationId));
      const latest = points.reduce<MovementPoint | undefined>((current, point) => !current || Date.parse(point.recordedAt) > Date.parse(current.recordedAt) ? point : current, undefined);
      expect(getRecommendationEvidence(data, user.id)).toEqual({ visited, latestPoint: latest });
    }
  });

  it("reuses unchanged history across users and unrelated updates but invalidates every evidence input", () => {
    const data = { ...initialData, points: [...initialData.points] };
    const evidence = getRecommendationEvidence(data, "tourist-demo");
    getRecommendationEvidence(data, "tourist-nature-demo");
    expect(getRecommendationEvidence({ ...data, users: [], sosAlerts: [] }, "tourist-demo")).toBe(evidence);
    for (const key of ["trips", "points", "checkIns", "destinations"] as const) {
      const original = getRecommendationEvidence(data, "tourist-demo");
      const changed = { ...data, [key]: [...data[key]] } as AppData;
      expect(getRecommendationEvidence(changed, "tourist-demo")).not.toBe(original);
    }
  });

  it("ignores orphan points, keeps active trip points out of visit evidence and isolates check-ins", () => {
    const destination = initialData.destinations[0];
    const trip = { ...initialData.trips[0], id: "active", userId: "owner", status: "active" as const };
    const point = { ...initialData.points[0], id: "owned", tripId: trip.id, userId: "other", latitude: destination.latitude, longitude: destination.longitude };
    const data = { ...initialData, trips: [trip], points: [point, { ...point, id: "orphan", tripId: "missing" }], checkIns: [] };
    expect(getRecommendationEvidence(data, "owner")).toEqual({ visited: new Set(), latestPoint: point });
    expect(getRecommendationEvidence(data, "other")).toEqual({ visited: new Set(), latestPoint: undefined });
    const checkedIn = { ...data, checkIns: [{ ...initialData.checkIns[0], userId: "owner", destinationId: destination.id }] };
    expect(getRecommendationEvidence(checkedIn, "owner").visited.has(destination.id)).toBe(true);
    expect(getRecommendationEvidence(checkedIn, "other").visited.size).toBe(0);
  });

  it("expires quality-dependent evidence and handles a backwards clock", () => {
    const data = { ...initialData, points: [...initialData.points] };
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const first = getRecommendationEvidence(data, "tourist-demo");
      clock.mockReturnValue(now + 4999);
      expect(getRecommendationEvidence(data, "tourist-demo")).toBe(first);
      clock.mockReturnValue(now + 5000);
      const expired = getRecommendationEvidence(data, "tourist-demo");
      expect(expired).not.toBe(first);
      clock.mockReturnValue(now);
      expect(getRecommendationEvidence(data, "tourist-demo")).not.toBe(expired);
    } finally { clock.mockRestore(); }
  });
});
