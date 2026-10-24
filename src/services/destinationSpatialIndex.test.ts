import { describe, expect, it } from "vitest";
import { destinations } from "../data/destinations";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";

describe("nearest-place lookup", () => {
  it("matches sorted distance results with bounded and unbounded searches", () => {
    const index = createDestinationSpatialIndex(destinations);
    for (const place of destinations) {
      const point = { latitude: place.latitude + 0.001, longitude: place.longitude - 0.001 };
      for (const radius of [undefined, 0, 1.2, 8]) {
        const expected = destinations.map(destination => ({ destination, distance: distanceKm(point, destination) }))
          .filter(row => radius === undefined || row.distance <= radius)
          .sort((a, b) => a.distance - b.distance)[0];
        expect(index.nearest(point, radius)).toEqual(expected);
      }
    }
  });

  it("retains the first equal-distance candidate and handles empty or out-of-range places", () => {
    const first = destinations[0];
    const tied = { ...first, id: "same-coordinates" };
    const index = createDestinationSpatialIndex([first, tied]);
    expect(index.nearest(first, 1.2)?.destination).toBe(first);
    expect(index.nearest(first, 0)?.destination).toBe(first);
    expect(index.nearest({ latitude: 0, longitude: 0 }, 1.2)).toBeUndefined();
    expect(createDestinationSpatialIndex([]).nearest(first)).toBeUndefined();
  });
});
