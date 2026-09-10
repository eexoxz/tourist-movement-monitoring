import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { summarizeTrip } from "./movement";
import { getTouristWorkspaceData } from "./touristWorkspace";

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
});
