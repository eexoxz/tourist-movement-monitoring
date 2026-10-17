import { describe, expect, it } from "vitest";
import type { Itinerary } from "../types";
import { initialData } from "../data/demoData";
import { buildDataExport } from "./dataExport";

describe("privacy-scoped downloads", () => {
  const tourist = initialData.users.find((user) => user.role === "tourist")!;
  it("exports the tourist's own records and plans without passwords", () => {
    const plan = { id: "mine", userId: tourist.id, deletedAt: "", notes: "Private" } as Itinerary;
    const output = buildDataExport(initialData, tourist, [plan, { ...plan, id: "other", userId: "someone-else" }, { ...plan, id: "deleted", deletedAt: "now" }]);
    expect(output.users).toHaveLength(1);
    expect(output.users[0].id).toBe(tourist.id);
    for (const rows of [output.trips, output.points, output.consents, output.analyses, output.recommendations, output.checkIns, output.sosAlerts, output.incidentReports]) expect(rows.every((row) => row.userId === tourist.id)).toBe(true);
    expect(output.itineraries).toEqual([plan]);
    expect(JSON.stringify(output)).not.toContain('"password"');
  });
  it("allows admin monitoring exports but excludes private itinerary notes and all passwords", () => {
    const admin = initialData.users.find((user) => user.role === "admin")!;
    const output = buildDataExport(initialData, admin, [{ userId: tourist.id, notes: "Private" } as Itinerary]);
    expect(output.trips).toEqual(initialData.trips);
    expect(output.itineraries).toEqual([]);
    expect(JSON.stringify(output)).not.toContain('"password"');
  });
});
