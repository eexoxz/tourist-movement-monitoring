import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Destination, MovementPoint } from "../types";
import { canConnectMapPoints, destinationGroupSpacing, groupMapDestinations, projectMapCoordinate, projectMovementPoints } from "./movementMapGeometry";
import { mapDisplayText } from "./mapDisplayCopy";

const catalogue = ["locations-2026-10.json", "locations-2026-10-27.json", "locations-2026-10-28.json"].flatMap((file) => JSON.parse(readFileSync(new URL(`../../catalogue/${file}`, import.meta.url), "utf8")).places) as Destination[];
const point = { id: "point", tripId: "trip", userId: "owner", latitude: 5.4, longitude: 100.3, accuracyMeters: 20, source: "browser", recordedAt: "2026-10-28T00:00:00Z" } as MovementPoint;

describe("large movement-map geometry", () => {
  it("projects all 50,000 points, reuses existing geometry on append and invalidates changed records", () => {
    const points = Array.from({ length: 50000 }, (_, index) => ({ ...point, id: `point-${index}`, longitude: 100.3 + index * .000001 }));
    const first = projectMovementPoints(points, 5);
    expect(first.xy).toHaveLength(100000);
    expect(first.xy.every(Number.isFinite)).toBe(true);
    expect(projectMapCoordinate(0, 0, 0)).toEqual([128, 128]);
    expect(projectMovementPoints(points, 5, first).xy).toBe(first.xy);
    const appended = projectMovementPoints([...points, { ...point, id: "new" }], 5, first);
    expect([...appended.xy.subarray(0, first.xy.length)]).toEqual([...first.xy]);
    const edited = [...points]; edited[3] = { ...edited[3], longitude: 110 };
    expect(projectMovementPoints(edited, 5, first).xy[6]).not.toBe(first.xy[6]);
    expect(projectMovementPoints(points, 6, first).xy[0]).toBeCloseTo(first.xy[0] * 2);
    expect(projectMapCoordinate(NaN, 100, 5).every(Number.isNaN)).toBe(true);
  });
  it("retains every catalogue member in nationwide and detailed groups, including coincident places", () => {
    for (const zoom of [4, 4.5, 6, 9, 14, 18]) {
      const groups = groupMapDestinations(catalogue, zoom);
      expect(groups.flatMap((group) => group.places.map((place) => place.id)).sort()).toEqual(catalogue.map((place) => place.id).sort());
      expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
      for (const group of groups) expect(new Set(group.places.map((place) => place.longitude < 106)).size).toBe(1);
      const positions = groups.map((group) => projectMapCoordinate(group.latitude, group.longitude, zoom));
      let minimumSpacing = Infinity;
      for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
        minimumSpacing = Math.min(minimumSpacing, Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1]));
      }
      expect(minimumSpacing).toBeGreaterThanOrEqual(destinationGroupSpacing);
    }
    const same = { ...catalogue[0], id: "same-coordinate" };
    expect(groupMapDestinations([catalogue[0], same], 18)[0].places).toHaveLength(2);
  });
  it("never joins different trips, tourists, reversed timestamps, stale GPS segments or implausible jumps", () => {
    const next = { ...point, longitude: 100.301, recordedAt: "2026-10-28T00:01:00Z" };
    expect(canConnectMapPoints(point, next)).toBe(true);
    for (const changed of [{ ...next, tripId: "other" }, { ...next, userId: "other" }, { ...next, recordedAt: "2026-10-27T00:00:00Z" }, { ...next, recordedAt: "2026-10-28T01:00:00Z" }, { ...next, longitude: 115 }]) expect(canConnectMapPoints(point, changed)).toBe(false);
  });
  it("translates the map counts and group instructions in every supported language", () => {
    for (const locale of ["ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"] as const)
      for (const key of ["loaded", "sources", "places", "national", "help", "overlap", "group", "close"] as const)
        expect(mapDisplayText(locale, key)).not.toBe(mapDisplayText("en", key));
  });
});
