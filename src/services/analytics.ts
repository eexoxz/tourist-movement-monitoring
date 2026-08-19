import type {
  AnalysisResult,
  AppData,
  DestinationCategory,
  MovementPoint,
  Recommendation,
  TouristProfile,
  TripSession,
} from "../types";
import { createId } from "./storage";
import { distanceKm, nearestDestination } from "./geo";

const categories: DestinationCategory[] = ["cultural", "nature", "urban", "heritage", "food", "coastal"];

function emptyCounts(): Record<DestinationCategory, number> {
  return {
    cultural: 0,
    nature: 0,
    urban: 0,
    heritage: 0,
    food: 0,
    coastal: 0,
  };
}

function categoryCounts(points: MovementPoint[], data: AppData) {
  const counts = emptyCounts();

  points.forEach((point) => {
    const nearest = nearestDestination(point, data.destinations);
    if (nearest && nearest.distance <= 1.2) {
      counts[nearest.destination.category] += 1;
    }
  });

  return counts;
}

function inferProfile(counts: Record<DestinationCategory, number>): TouristProfile {
  const culturalScore = counts.cultural + counts.heritage;
  const natureScore = counts.nature + counts.coastal;
  const urbanScore = counts.urban + counts.food;
  const ranked: Array<[TouristProfile, number]> = [
    ["cultural", culturalScore],
    ["nature", natureScore],
    ["urban", urbanScore],
  ];
  const [top, second] = ranked.sort((a, b) => b[1] - a[1]);

  if (top[1] === 0 || top[1] === second[1]) {
    return "mixed";
  }

  return top[0];
}

function vectorFromCounts(counts: Record<DestinationCategory, number>) {
  const total = Math.max(
    1,
    categories.reduce((sum, category) => sum + counts[category], 0)
  );

  return categories.map((category) => counts[category] / total);
}

function clusterForVector(vector: number[]) {
  const centroids = [
    [0.42, 0.05, 0.05, 0.32, 0.12, 0.04],
    [0.05, 0.48, 0.05, 0.05, 0.08, 0.29],
    [0.08, 0.06, 0.43, 0.08, 0.3, 0.05],
  ];

  const distances = centroids.map((centroid) =>
    Math.sqrt(centroid.reduce((sum, value, index) => sum + Math.pow(value - vector[index], 2), 0))
  );

  const smallest = Math.min(...distances);
  const second = distances.filter((value) => value !== smallest).sort((a, b) => a - b)[0] ?? smallest;

  return {
    cluster: distances.indexOf(smallest),
    silhouetteScore: Number(Math.max(0.12, Math.min(0.91, (second - smallest) / Math.max(second, 0.01))).toFixed(2)),
  };
}

function profileMatchesCategory(profile: TouristProfile, category: DestinationCategory) {
  if (profile === "mixed") {
    return true;
  }

  if (profile === "cultural") {
    return category === "cultural" || category === "heritage";
  }

  if (profile === "nature") {
    return category === "nature" || category === "coastal";
  }

  return category === "urban" || category === "food";
}

export function analyzeTrip(trip: TripSession, data: AppData): AnalysisResult | null {
  const points = data.points.filter((point) => point.tripId === trip.id);

  if (points.length < 2) {
    return null;
  }

  const counts = categoryCounts(points, data);
  const profile = inferProfile(counts);
  const vector = vectorFromCounts(counts);
  const cluster = clusterForVector(vector);

  return {
    tripId: trip.id,
    userId: trip.userId,
    cluster: cluster.cluster,
    profile,
    silhouetteScore: cluster.silhouetteScore,
    categoryCounts: counts,
    generatedAt: new Date().toISOString(),
  };
}

export function recommendForUser(userId: string, data: AppData, analysis?: AnalysisResult): Recommendation[] {
  const userTrips = data.trips.filter((trip) => trip.userId === userId);
  const points = data.points.filter((point) => userTrips.some((trip) => trip.id === point.tripId));
  const visited = new Set(
    points
      .map((point) => nearestDestination(point, data.destinations))
      .filter((result) => result && result.distance <= 1.2)
      .map((result) => result.destination.id)
  );
  const latestPoint = points.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const profile = analysis?.profile ?? "mixed";

  return data.destinations
    .filter((destination) => !visited.has(destination.id))
    .map((destination) => {
      const profileScore = profileMatchesCategory(profile, destination.category) ? 45 : 12;
      const unvisitedScore = 25;
      const distanceScore = latestPoint ? Math.max(0, 30 - distanceKm(latestPoint, destination) * 1.4) : 14;
      const score = Math.round(profileScore + unvisitedScore + distanceScore);
      const reason =
        profile === "mixed"
          ? "Matches a balanced movement profile and has not been visited in the current history."
          : `Matches the ${profile} travel profile and has not been visited in the current history.`;

      return {
        id: createId("recommendation"),
        userId,
        destinationId: destination.id,
        score,
        reason,
        generatedAt: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

export function refreshAnalysis(data: AppData, userId: string): AppData {
  const completedTrips = data.trips.filter((trip) => trip.userId === userId && trip.status === "completed");
  const analyses = completedTrips
    .map((trip) => analyzeTrip(trip, data))
    .filter((analysis): analysis is AnalysisResult => Boolean(analysis));
  const latestAnalysis = analyses.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
  const recommendations = recommendForUser(userId, data, latestAnalysis);

  return {
    ...data,
    analyses: [...data.analyses.filter((analysis) => analysis.userId !== userId), ...analyses],
    recommendations: [...data.recommendations.filter((recommendation) => recommendation.userId !== userId), ...recommendations],
  };
}
