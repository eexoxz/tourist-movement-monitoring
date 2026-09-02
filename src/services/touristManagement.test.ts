import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { getTouristManagementRows } from "./touristManagement";

describe("tourist management service", () => {
  it("summarizes tourist profile, movement, check-in, and safety records", () => {
    const rows = getTouristManagementRows(initialData);
    const culturalDemo = rows.find((row) => row.tourist.id === "tourist-cultural-demo");

    expect(rows.length).toBeGreaterThanOrEqual(300);
    expect(culturalDemo?.completedTrips).toBeGreaterThan(0);
    expect(culturalDemo?.checkIns).toBeGreaterThan(0);
    expect(culturalDemo?.openSafetyCases).toBeGreaterThan(0);
    expect(culturalDemo?.latestDestinationNames.length).toBeGreaterThan(0);
  });

  it("keeps admin users out of tourist management rows", () => {
    const rows = getTouristManagementRows(initialData);

    expect(rows.some((row) => row.tourist.role === "admin")).toBe(false);
  });
});
