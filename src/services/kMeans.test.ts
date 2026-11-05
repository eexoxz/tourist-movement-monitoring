import { describe, expect, it } from "vitest";
import { clusterVectors } from "./kMeans";

describe("K-Means group recovery", () => {
  it("separates the report's repeated vectors across the same 27 deterministic orders", () => {
    const vectors = [[0.9, 0.05, 0.05, 0.2], [0.05, 0.9, 0.05, 0.2], [0.05, 0.05, 0.9, 0.2]];
    const grouped = vectors.flatMap((vector) => Array.from({ length: 4 }, () => [...vector]));
    const orders = [grouped, [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11].map((index) => grouped[index]), [...grouped].reverse()];
    let seed = 20261101;
    for (let run = 0; run < 24; run += 1) {
      const shuffled = [...grouped];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const other = Math.floor(seed / 4294967296 * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
      }
      orders.push(shuffled);
    }
    for (const order of orders) {
      const { assignments, centroids } = clusterVectors(order);
      expect(new Set(assignments).size).toBe(3);
      order.forEach((vector, index) => expect(centroids[assignments[index]]).toEqual(vector));
    }
  });

  it("recovers a group that empties after distinct initialisation, without stealing a singleton", () => {
    const vectors = [[5, 4], [4, 13], [3, 10], [4, 12], [15, 10], [12, 8], [3, 5], [11, 7], [15, 5], [18, 2]];
    const snapshot = structuredClone(vectors);
    const { assignments, centroids } = clusterVectors(vectors);
    expect(assignments).toEqual([2, 2, 2, 2, 0, 0, 2, 0, 0, 1]);
    expect(centroids).toEqual([[13.25, 7.5], [18, 2], [3.8, 8.8]]);
    centroids.forEach((centroid, cluster) => {
      const members = vectors.filter((_, index) => assignments[index] === cluster);
      expect(members.length).toBeGreaterThan(0);
      expect(centroid).toEqual(centroid.map((_, dimension) => members.reduce((sum, vector) => sum + vector[dimension], 0) / members.length));
    });
    expect(vectors).toEqual(snapshot);
  });

  it("caps groups by distinct evidence and retains duplicate samples in the mean", () => {
    expect(clusterVectors([])).toEqual({ assignments: [], centroids: [] });
    expect(clusterVectors([[1], [1], [1]])).toEqual({ assignments: [0, 0, 0], centroids: [[1]] });
    expect(clusterVectors([[0], [0], [10]])).toEqual({ assignments: [0, 0, 1], centroids: [[0], [10]] });
    const result = clusterVectors([[0], [0], [10], [20], [1]]);
    expect(result.centroids[result.assignments[0]][0]).toBeCloseTo(1 / 3);
  });
});
