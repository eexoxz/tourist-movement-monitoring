export function silhouetteScores(vectors: number[][], assignments: number[], clusterCount: number) {
  if (clusterCount <= 1 || vectors.length <= 1) return vectors.map(() => 0);
  const groups = new Map<string, { vector: number[]; counts: number[] }>();
  const keys = vectors.map((vector, index) => {
    const key = JSON.stringify(vector);
    const group = groups.get(key) ?? { vector, counts: Array<number>(clusterCount).fill(0) };
    group.counts[assignments[index]] += 1;
    groups.set(key, group);
    return key;
  });
  const totals = Array<number>(clusterCount).fill(0);
  for (const { counts } of groups.values()) counts.forEach((count, index) => { totals[index] += count; });
  const sumsByVector = new Map<string, number[]>();

  // Identical trip vectors have identical distances; their multiplicities preserve the exact mean.
  for (const [key, { vector }] of groups) {
    const sums = Array<number>(clusterCount).fill(0);
    for (const candidate of groups.values()) {
      const distance = Math.sqrt(vector.reduce((sum, value, index) => sum + (value - candidate.vector[index]) ** 2, 0));
      candidate.counts.forEach((count, index) => { sums[index] += distance * count; });
    }
    sumsByVector.set(key, sums);
  }

  return keys.map((key, index) => {
    const cluster = assignments[index];
    const sums = sumsByVector.get(key)!;
    const a = totals[cluster] > 1 ? sums[cluster] / (totals[cluster] - 1) : 0;
    const b = Math.min(...totals.map((count, other) => other !== cluster && count > 0 ? sums[other] / count : Infinity));
    return Number.isFinite(b) && Math.max(a, b) > 0 ? Number(((b - a) / Math.max(a, b)).toFixed(2)) : 0;
  });
}
