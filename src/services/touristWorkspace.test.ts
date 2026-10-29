import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { summarizeTrip } from "./movement";
import { createTouristWorkspaceSelector, getTouristWorkspaceData } from "./touristWorkspace";

const firstTrip = initialData.trips.find((trip) => trip.id === "trip-demo-1")!;
const twoTripData = {
  ...initialData,
  trips: [...initialData.trips, { ...firstTrip, id: "trip-selection-test", label: "Second saved route" }],
  points: [...initialData.points, ...initialData.points.filter((point) => point.tripId === firstTrip.id).map((point) => ({ ...point, id: `second-${point.id}`, tripId: "trip-selection-test" }))],
};

describe("tourist workspace selector", () => {
  it("prepares tourist trip, recommendation, and safety data in one selector", () => {
    const workspace = getTouristWorkspaceData(initialData, "tourist-demo", "");

    expect(workspace.userTrips.length).toBeGreaterThan(0);
    expect(workspace.recentTrips[0]?.startedAt).toBeTruthy();
    expect(workspace.latestCompletedTrip?.status).toBe("completed");
    expect(workspace.selectedTripRecommendations.length).toBeLessThanOrEqual(3);
    expect(workspace.openSafetyCount).toBeGreaterThanOrEqual(0);
  });

  it("keeps selected trip summaries aligned with movement summary logic", () => {
    const selectedTripId = "trip-demo-1";
    const workspace = getTouristWorkspaceData(initialData, "tourist-demo", selectedTripId);
    const expectedSummary = summarizeTrip(initialData, selectedTripId);

    expect(workspace.selectedTrip?.id).toBe(selectedTripId);
    expect(workspace.selectedTripSummary).toEqual(expectedSummary);
    expect(workspace.selectedTripPoints.map((point) => point.recordedAt)).toEqual(
      [...workspace.selectedTripPoints].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).map((point) => point.recordedAt)
    );
  });

  it("falls back to the most recent trip when no selected trip id is provided", () => {
    const workspace = getTouristWorkspaceData(initialData, "tourist-demo", "");
    const expectedRecentTrip = [...workspace.userTrips].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

    expect(workspace.selectedTrip?.id).toBe(expectedRecentTrip.id);
  });

  it("reuses all-trip calculations while selecting different saved routes", () => {
    const select = createTouristWorkspaceSelector();
    const first = select(twoTripData, "tourist-demo", "trip-demo-1");
    const otherId = first.userTrips.find((trip) => trip.id !== first.selectedTrip?.id)!.id;
    const other = select(twoTripData, "tourist-demo", otherId);
    expect(other.selectedTrip?.id).toBe(otherId);
    expect(other.tripSummaries).toBe(first.tripSummaries);
    expect(other.tripPoints).toBe(first.tripPoints);
    expect(other.visitedDestinationIds).toBe(first.visitedDestinationIds);
    expect(other).toEqual(getTouristWorkspaceData(twoTripData, "tourist-demo", otherId));
    expect(select(twoTripData, "tourist-demo", otherId)).toBe(other);
  });

  it("keeps every route projection identical to the uncached selector", () => {
    const select = createTouristWorkspaceSelector();
    for (const trip of twoTripData.trips.filter((trip) => trip.userId === "tourist-demo")) {
      expect(select(twoTripData, "tourist-demo", trip.id)).toEqual(getTouristWorkspaceData(twoTripData, "tourist-demo", trip.id));
    }
    expect(select(twoTripData, "tourist-demo", "someone-elses-trip")).toEqual(getTouristWorkspaceData(twoTripData, "tourist-demo", ""));
  });

  it("invalidates cached summaries and names when data or the account changes", () => {
    const select = createTouristWorkspaceSelector();
    const before = select(initialData, "tourist-demo", "trip-demo-1");
    const renamed = { ...initialData, trips: initialData.trips.map((trip) => trip.id === "trip-demo-1" ? { ...trip, label: "Updated route" } : trip) };
    const after = select(renamed, "tourist-demo", "trip-demo-1");
    expect(after.selectedTrip?.label).toBe("Updated route");
    expect(after.tripSummaries).not.toBe(before.tripSummaries);
    const otherUser = select(renamed, "tourist-nature-demo", "trip-demo-1");
    expect(otherUser.userTrips.every((trip) => trip.userId === "tourist-nature-demo")).toBe(true);
    expect(otherUser).toEqual(getTouristWorkspaceData(renamed, "tourist-nature-demo", "trip-demo-1"));
    expect(select(renamed, "no-trips-user", "trip-demo-1").selectedTrip).toBeUndefined();
  });

  it("reuses history for profile-only updates but refreshes safety, consent and check-in changes", () => {
    const select = createTouristWorkspaceSelector();
    const before = select(initialData, "tourist-demo", "trip-demo-1");
    const profileOnly = { ...initialData, users: initialData.users.map((user) => ({ ...user, name: `${user.name} changed` })) };
    expect(select(profileOnly, "tourist-demo", "trip-demo-1")).toBe(before);
    const changed = { ...profileOnly, consents: [], checkIns: [], sosAlerts: [], incidentReports: [] };
    const refreshed = select(changed, "tourist-demo", "trip-demo-1");
    expect(refreshed).not.toBe(before);
    expect(refreshed.currentConsent).toBeNull();
    expect(refreshed.openSafetyCount).toBe(0);
    expect(refreshed).toEqual(getTouristWorkspaceData(changed, "tourist-demo", "trip-demo-1"));
  });
});
