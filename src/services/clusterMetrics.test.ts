import { describe, expect, it } from "vitest";
import { silhouetteScores } from "./clusterMetrics";

function referenceScores(vectors: number[][], assignments: number[], k: number) {
  return vectors.map((vector, index) => {
    if (k <= 1 || vectors.length <= 1) return 0;
    const distances = vectors.map((other) => Math.sqrt(vector.reduce((sum, value, dimension) => sum + (value - other[dimension]) ** 2, 0)));
    const own = distances.filter((_, other) => other !== index && assignments[other] === assignments[index]);
    const a = own.length ? own.reduce((sum, value) => sum + value, 0) / own.length : 0;
    const b = Math.min(...Array.from({ length: k }, (_, cluster) => {
      const candidates = distances.filter((_, other) => assignments[other] === cluster);
      return cluster !== assignments[index] && candidates.length ? candidates.reduce((sum, value) => sum + value, 0) / candidates.length : Infinity;
    }));
    return Number.isFinite(b) && Math.max(a, b) > 0 ? Number(((b - a) / Math.max(a, b)).toFixed(2)) : 0;
  });
}

describe("grouped silhouette calculation", () => {
  it("preserves the existing exact scores for repeated vectors and mixed assignments", () => {
    const vectors = Array.from({ length: 300 }, (_, index) => [index % 7 / 7, index % 3 / 3, index % 5 / 5]);
    const assignments = vectors.map((_, index) => index % 3);
    expect(silhouetteScores(vectors, assignments, 3)).toEqual(referenceScores(vectors, assignments, 3));
  });

  it("preserves single cluster, singleton and empty cluster behavior", () => {
    for (const [vectors, assignments, k] of [
      [[], [], 0], [[[1]], [0], 1], [[[1], [2]], [0, 0], 1],
      [[[1], [1], [2]], [0, 0, 1], 3], [[[1], [1]], [0, 1], 2],
    ] as [number[][], number[], number][]) {
      expect(silhouetteScores(vectors, assignments, k)).toEqual(referenceScores(vectors, assignments, k));
    }
  });
});
