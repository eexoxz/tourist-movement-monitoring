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
type TripFeature = {
  trip: TripSession;
  counts: Record<DestinationCategory, number>;
  vector: number[];
  profile: TouristProfile;
  pointCount: number;
};

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

function euclidean(a: number[], b: number[]) {
  return Math.sqrt(a.reduce((sum, value, index) => sum + Math.pow(value - b[index], 2), 0));
}

function averageVector(vectors: number[][], fallback: number[]) {
  if (vectors.length === 0) {
    return fallback;
  }

  return fallback.map((_, index) => vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length);
}

function createTripFeatures(data: AppData): TripFeature[] {
  return data.trips
    .filter((trip) => trip.status === "completed")
    .map((trip) => {
      const points = data.points.filter((point) => point.tripId === trip.id);
      if (points.length < 2) {
        return null;
      }

      const counts = categoryCounts(points, data);
      const vector = vectorFromCounts(counts);

      return {
        trip,
        counts,
        vector,
        profile: inferProfile(counts),
        pointCount: points.length,
      };
    })
    .filter((feature): feature is TripFeature => Boolean(feature));
}

function runKMeans(features: TripFeature[]) {
  if (features.length === 0) {
    return new Map<string, { cluster: number; silhouetteScore: number }>();
  }

  const k = Math.min(3, features.length);
  let centroids = features.slice(0, k).map((feature) => feature.vector);
  let assignments = features.map((_, index) => index % k);

  for (let iteration = 0; iteration < 12; iteration += 1) {
    assignments = features.map((feature) => {
      const distances = centroids.map((centroid) => euclidean(feature.vector, centroid));
      return distances.indexOf(Math.min(...distances));
    });

    centroids = centroids.map((centroid, clusterIndex) =>
      averageVector(
        features.filter((_, featureIndex) => assignments[featureIndex] === clusterIndex).map((feature) => feature.vector),
        centroid
      )
    );
  }

  return new Map(
    features.map((feature, index) => [
      feature.trip.id,
      {
        cluster: assignments[index],
        silhouetteScore: silhouetteForFeature(features, assignments, index, k),
      },
    ])
  );
}

function silhouetteForFeature(features: TripFeature[], assignments: number[], featureIndex: number, k: number) {
  if (k <= 1 || features.length <= 1) {
    return 0;
  }

  const feature = features[featureIndex];
  const ownCluster = assignments[featureIndex];
  const ownDistances = features
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ index }) => index !== featureIndex && assignments[index] === ownCluster)
    .map(({ candidate }) => euclidean(feature.vector, candidate.vector));

  const a = ownDistances.length ? ownDistances.reduce((sum, value) => sum + value, 0) / ownDistances.length : 0;
  const otherAverages = Array.from({ length: k }, (_, clusterIndex) => clusterIndex)
    .filter((clusterIndex) => clusterIndex !== ownCluster)
    .map((clusterIndex) => {
      const distances = features
        .filter((_, index) => assignments[index] === clusterIndex)
        .map((candidate) => euclidean(feature.vector, candidate.vector));
      return distances.length ? distances.reduce((sum, value) => sum + value, 0) / distances.length : Number.POSITIVE_INFINITY;
    });
  const b = Math.min(...otherAverages);

  if (!Number.isFinite(b) || Math.max(a, b) === 0) {
    return 0;
  }

  return Number(((b - a) / Math.max(a, b)).toFixed(2));
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

  return {
    tripId: trip.id,
    userId: trip.userId,
    cluster: 0,
    profile,
    silhouetteScore: 0,
    categoryCounts: counts,
    dataPointCount: points.length,
    method: "k-means",
    generatedAt: new Date().toISOString(),
  };
}

export function analyzeAllTrips(data: AppData): AnalysisResult[] {
  const features = createTripFeatures(data);
  const clusters = runKMeans(features);
  const generatedAt = new Date().toISOString();

  return features.map((feature) => {
    const cluster = clusters.get(feature.trip.id) ?? { cluster: 0, silhouetteScore: 0 };

    return {
      tripId: feature.trip.id,
      userId: feature.trip.userId,
      cluster: cluster.cluster,
      profile: feature.profile,
      silhouetteScore: cluster.silhouetteScore,
      categoryCounts: feature.counts,
      dataPointCount: feature.pointCount,
      method: "k-means",
      generatedAt,
    };
  });
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
  const analyses = analyzeAllTrips(data);
  const latestAnalysis = analyses
    .filter((analysis) => analysis.userId === userId)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
  const recommendationData = { ...data, analyses };
  const recommendations = recommendForUser(userId, recommendationData, latestAnalysis);

  return {
    ...data,
    analyses,
    recommendations: [...data.recommendations.filter((recommendation) => recommendation.userId !== userId), ...recommendations],
  };
}

export function refreshAllRecommendations(data: AppData): AppData {
  const analyses = analyzeAllTrips(data);
  const users = data.users.filter((user) => user.role === "tourist");
  const withAnalyses = { ...data, analyses };
  const recommendations = users.flatMap((user) => {
    const latestAnalysis = analyses
      .filter((analysis) => analysis.userId === user.id)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
    return recommendForUser(user.id, withAnalyses, latestAnalysis);
  });

  return { ...withAnalyses, recommendations };
}
