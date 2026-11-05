function squaredDistance(a: number[], b: number[]) {
  return a.reduce((sum, value, dimension) => sum + (value - b[dimension]) ** 2, 0);
}

// Move an outlying sample from a group with spare members into each empty group.
// Update counts after every move so a later repair cannot empty a singleton.
function fillEmptyClusters(vectors: number[][], assignments: number[], centroids: number[][]) {
  const counts = centroids.map(() => 0);
  assignments.forEach((cluster) => { counts[cluster] += 1; });
  for (let cluster = 0; cluster < centroids.length; cluster += 1) {
    if (counts[cluster] > 0) continue;
    let candidate = -1;
    let largestDistance = -1;
    vectors.forEach((vector, index) => {
      const owner = assignments[index];
      const distance = squaredDistance(vector, centroids[owner]);
      if (counts[owner] > 1 && distance > largestDistance) {
        candidate = index;
        largestDistance = distance;
      }
    });
    if (candidate < 0) continue;
    counts[assignments[candidate]] -= 1;
    assignments[candidate] = cluster;
    counts[cluster] += 1;
  }
}

export function clusterVectors(vectors: number[][]) {
  // Duplicate starting vectors cannot seed separate groups. Use up to three
  // distinct observed vectors, retaining the existing input order and iteration cap.
  let centroids = [...new Map(vectors.map((vector) => [JSON.stringify(vector), vector])).values()]
    .slice(0, 3).map((vector) => [...vector]);
  let assignments = vectors.map(() => -1);
  for (let iteration = 0; iteration < 12 && centroids.length > 0; iteration += 1) {
    assignments = vectors.map((vector, index) => {
      const distances = centroids.map((centroid) => squaredDistance(vector, centroid));
      const closest = Math.min(...distances);
      const previous = assignments[index];
      // Keep an existing assignment on exact ties, including repaired groups.
      return distances[previous] === closest ? previous : distances.indexOf(closest);
    });
    fillEmptyClusters(vectors, assignments, centroids);
    const counts = centroids.map(() => 0);
    const sums = centroids.map((centroid) => centroid.map(() => 0));
    vectors.forEach((vector, index) => {
      const cluster = assignments[index];
      counts[cluster] += 1;
      vector.forEach((value, dimension) => { sums[cluster][dimension] += value; });
    });
    centroids = sums.map((sum, cluster) => sum.map((value) => value / counts[cluster]));
  }
  return { assignments, centroids };
}
