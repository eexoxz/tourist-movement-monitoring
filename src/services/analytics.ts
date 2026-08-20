import type {
  AnalysisResult,
  AiEvaluation,
  AppData,
  Destination,
  DestinationDemand,
  DestinationCategory,
  MovementAlert,
  MovementPoint,
  Recommendation,
  TouristProfile,
  TravelPlan,
  TravelPlanOptions,
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

type DecisionTreeFeatures = {
  culturalScore: number;
  natureScore: number;
  urbanScore: number;
  total: number;
  diversityCount: number;
  topProfile: TouristProfile;
  topScore: number;
  secondScore: number;
  topShare: number;
};

type DecisionTreeResult = {
  profile: TouristProfile;
  confidence: number;
  path: string[];
  depth: number;
  evaluatedRules: number;
};

type ClusterAssignment = {
  cluster: number;
  silhouetteScore: number;
  centroid: number[];
  distanceToCentroid: number;
  label: string;
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

  prepareMovementPoints(points).forEach((point) => {
    const nearest = nearestDestination(point, data.destinations);
    if (nearest && nearest.distance <= 1.2) {
      counts[nearest.destination.category] += 1;
    }
  });

  return counts;
}

function prepareMovementPoints(points: MovementPoint[]) {
  const sortedPoints = [...points]
    .filter((point) => Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180)
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  return sortedPoints.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = sortedPoints[index - 1];
    const secondsApart = Math.abs(new Date(point.recordedAt).getTime() - new Date(previous.recordedAt).getTime()) / 1000;
    return distanceKm(point, previous) >= 0.04 || secondsApart >= 60;
  });
}

function inferProfile(counts: Record<DestinationCategory, number>): TouristProfile {
  return classifyWithDecisionTree(counts).profile;
}

function decisionTreeFeatures(counts: Record<DestinationCategory, number>): DecisionTreeFeatures {
  const culturalScore = counts.cultural + counts.heritage;
  const natureScore = counts.nature + counts.coastal;
  const urbanScore = counts.urban + counts.food;
  const total = culturalScore + natureScore + urbanScore;
  const branches: Array<[TouristProfile, number]> = [
    ["cultural", culturalScore],
    ["nature", natureScore],
    ["urban", urbanScore],
  ];
  const ranked = branches.sort((a, b) => b[1] - a[1]);
  const [top, second] = ranked;
  const diversityCount = [culturalScore, natureScore, urbanScore].filter((score) => score > 0).length;

  return {
    culturalScore,
    natureScore,
    urbanScore,
    total,
    diversityCount,
    topProfile: top[0],
    topScore: top[1],
    secondScore: second[1],
    topShare: total === 0 ? 0 : top[1] / total,
  };
}

function treeConfidence(features: DecisionTreeFeatures, base: number) {
  if (features.total < 2) {
    return 0.35;
  }

  const dominance = features.total === 0 ? 0 : (features.topScore - features.secondScore) / features.total;
  const diversityPenalty = Math.max(0, features.diversityCount - 1) * 0.05;
  return Number(Math.min(0.96, Math.max(0.4, base + dominance * 0.32 - diversityPenalty)).toFixed(2));
}

function classifyWithDecisionTree(counts: Record<DestinationCategory, number>): DecisionTreeResult {
  const features = decisionTreeFeatures(counts);
  const path = [
    `Feature extraction: cultural=${features.culturalScore}, nature=${features.natureScore}, urban=${features.urbanScore}, total=${features.total}`,
  ];
  let depth = 1;
  let evaluatedRules = 1;

  path.push(`Rule 1: total matched destination points >= 2 -> ${features.total >= 2 ? "yes" : "no"}`);
  if (features.total < 2) {
    return {
      profile: "mixed" as const,
      confidence: 0.35,
      path: [...path, "Leaf: mixed because the route has too little destination evidence."],
      depth,
      evaluatedRules,
    };
  }

  depth += 1;
  evaluatedRules += 1;
  path.push(`Rule 2: top interest share >= 55% -> ${features.topShare >= 0.55 ? "yes" : "no"} (${Math.round(features.topShare * 100)}%)`);
  if (features.topShare < 0.55 && features.diversityCount >= 2) {
    return {
      profile: "mixed" as const,
      confidence: treeConfidence(features, 0.55),
      path: [...path, "Leaf: mixed because movement is spread across multiple attraction groups."],
      depth,
      evaluatedRules,
    };
  }

  depth += 1;
  evaluatedRules += 1;
  path.push(`Rule 3: strongest branch is nature/coastal -> ${features.topProfile === "nature" ? "yes" : "no"}`);
  if (features.topProfile === "nature") {
    return {
      profile: "nature" as const,
      confidence: treeConfidence(features, 0.72),
      path: [...path, "Leaf: nature profile because nature/coastal visits dominate the route."],
      depth,
      evaluatedRules,
    };
  }

  depth += 1;
  evaluatedRules += 1;
  path.push(`Rule 4: strongest branch is cultural/heritage -> ${features.topProfile === "cultural" ? "yes" : "no"}`);
  if (features.topProfile === "cultural") {
    return {
      profile: "cultural" as const,
      confidence: treeConfidence(features, 0.72),
      path: [...path, "Leaf: cultural profile because cultural/heritage visits dominate the route."],
      depth,
      evaluatedRules,
    };
  }

  depth += 1;
  evaluatedRules += 1;
  path.push(`Rule 5: strongest branch is urban/food -> ${features.topProfile === "urban" ? "yes" : "no"}`);
  if (features.topProfile === "urban") {
    return {
      profile: "urban" as const,
      confidence: treeConfidence(features, 0.72),
      path: [...path, "Leaf: urban profile because urban/food visits dominate the route."],
      depth,
      evaluatedRules,
    };
  }

  depth += 1;
  evaluatedRules += 1;
  path.push(`Rule 6: diversity count >= 2 -> ${features.diversityCount >= 2 ? "yes" : "no"}`);
  if (features.diversityCount >= 2) {
    return {
      profile: "mixed" as const,
      confidence: treeConfidence(features, 0.58),
      path: [...path, "Leaf: mixed because no single branch is decisive after tie-breaking."],
      depth,
      evaluatedRules,
    };
  }

  return {
    profile: "mixed" as const,
    confidence: treeConfidence(features, 0.5),
    path: [...path, "Leaf: mixed because the tree could not identify a strong travel preference."],
    depth,
    evaluatedRules,
  };
}

function vectorFromCounts(counts: Record<DestinationCategory, number>) {
  const total = Math.max(
    1,
    categories.reduce((sum, category) => sum + counts[category], 0)
  );

  return categories.map((category) => counts[category] / total);
}

function centroidRecord(vector: number[]) {
  return categories.reduce<Record<DestinationCategory, number>>((values, category, index) => {
    values[category] = Number((vector[index] * 100).toFixed(1));
    return values;
  }, emptyCounts());
}

function clusterLabel(vector: number[]) {
  const ranked = categories
    .map((category, index) => ({ category, weight: vector[index] }))
    .sort((a, b) => b.weight - a.weight)
    .filter((item) => item.weight > 0.05);

  if (ranked.length === 0) {
    return "Sparse movement cluster";
  }

  if (ranked.length === 1) {
    return `${ranked[0].category} movement cluster`;
  }

  return `${ranked[0].category}/${ranked[1].category} movement cluster`;
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
      const points = prepareMovementPoints(data.points.filter((point) => point.tripId === trip.id));
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
    return new Map<string, ClusterAssignment>();
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
        centroid: centroids[assignments[index]],
        distanceToCentroid: Number(euclidean(feature.vector, centroids[assignments[index]]).toFixed(3)),
        label: clusterLabel(centroids[assignments[index]]),
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

function demandTier(score: number): DestinationDemand["tier"] {
  if (score >= 75) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  if (score >= 20) {
    return "emerging";
  }

  return "low";
}

const demandTierWeight: Record<DestinationDemand["tier"], number> = {
  low: 1,
  emerging: 2,
  medium: 3,
  high: 4,
};

function calculateApproachSignals(data: AppData, destinationId: string) {
  const destination = data.destinations.find((candidate) => candidate.id === destinationId);
  if (!destination) {
    return { approachSignalCount: 0, approachingTouristCount: 0 };
  }

  let approachSignalCount = 0;
  const approachingTouristIds = new Set<string>();

  data.trips.forEach((trip) => {
    const points = prepareMovementPoints(data.points.filter((point) => point.tripId === trip.id));

    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      const previousDistance = distanceKm(previous, destination);
      const currentDistance = distanceKm(point, destination);
      const movedCloserBy = previousDistance - currentDistance;

      if (previousDistance <= 8 && currentDistance <= 8 && movedCloserBy >= 0.08) {
        approachSignalCount += 1;
        approachingTouristIds.add(trip.userId);
      }
    });
  });

  return {
    approachSignalCount,
    approachingTouristCount: approachingTouristIds.size,
  };
}

export function calculateDestinationDemand(data: AppData): DestinationDemand[] {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rows = data.destinations.map((destination) => {
    const nearbyPoints = data.points.filter((point) => {
      const nearest = nearestDestination(point, data.destinations);
      return nearest?.destination.id === destination.id && nearest.distance <= 1.2;
    });
    const tripIds = new Set(nearbyPoints.map((point) => point.tripId));
    const touristIds = new Set(
      data.trips.filter((trip) => tripIds.has(trip.id)).map((trip) => trip.userId)
    );
    const recentPointCount = nearbyPoints.filter((point) => new Date(point.recordedAt).getTime() >= since).length;
    const approach = calculateApproachSignals(data, destination.id);

    return {
      destinationId: destination.id,
      movementPointCount: nearbyPoints.length,
      uniqueTouristCount: touristIds.size,
      recentPointCount,
      approachSignalCount: approach.approachSignalCount,
      approachingTouristCount: approach.approachingTouristCount,
      rawScore:
        nearbyPoints.length * 8 +
        touristIds.size * 18 +
        recentPointCount * 10 +
        approach.approachSignalCount * 12 +
        approach.approachingTouristCount * 20,
    };
  });
  const maxScore = Math.max(1, ...rows.map((row) => row.rawScore));

  return rows
    .map((row) => {
      const popularityScore = Math.round((row.rawScore / maxScore) * 100);

      return {
        destinationId: row.destinationId,
        movementPointCount: row.movementPointCount,
        uniqueTouristCount: row.uniqueTouristCount,
        recentPointCount: row.recentPointCount,
        approachSignalCount: row.approachSignalCount,
        approachingTouristCount: row.approachingTouristCount,
        popularityScore,
        tier: demandTier(popularityScore),
      };
    })
    .sort((a, b) => b.popularityScore - a.popularityScore);
}

export function getDestinationDemand(data: AppData, destinationId: string) {
  return calculateDestinationDemand(data).find((row) => row.destinationId === destinationId) ?? null;
}

function movementAlertSeverity(row: DestinationDemand): MovementAlert["severity"] {
  if (row.tier === "high" && (row.approachSignalCount > 0 || row.uniqueTouristCount >= 2)) {
    return "critical";
  }

  if (row.tier === "high" || row.tier === "medium" || row.approachSignalCount > 0) {
    return "watch";
  }

  return "info";
}

export function calculateMovementAlerts(data: AppData): MovementAlert[] {
  const generatedAt = new Date().toISOString();

  return calculateDestinationDemand(data)
    .filter((row) => row.popularityScore > 0 && (row.tier !== "low" || row.approachSignalCount > 0))
    .map((row) => {
      const destination = data.destinations.find((candidate) => candidate.id === row.destinationId);
      const severity = movementAlertSeverity(row);
      const visitorCount = Math.max(row.uniqueTouristCount, row.approachingTouristCount);

      return {
        id: `alert-${row.destinationId}`,
        destinationId: row.destinationId,
        severity,
        title: `${destination?.name ?? "Destination"} movement ${severity}`,
        message: `${row.popularityScore}% demand with ${row.movementPointCount} nearby point(s), ${row.recentPointCount} recent point(s), and ${row.approachSignalCount} approach signal(s).`,
        recommendedAction:
          severity === "critical"
            ? "Prioritise crowd monitoring and consider promoting nearby alternative stops."
            : severity === "watch"
            ? "Keep this destination visible in travel plans and monitor whether movement continues rising."
            : "Use as an emerging recommendation candidate when it fits the tourist profile.",
        score: row.popularityScore + row.approachSignalCount * 8 + visitorCount * 6,
        generatedAt,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function analyzeTrip(trip: TripSession, data: AppData): AnalysisResult | null {
  const points = prepareMovementPoints(data.points.filter((point) => point.tripId === trip.id));

  if (points.length < 2) {
    return null;
  }

  const counts = categoryCounts(points, data);
  const classification = classifyWithDecisionTree(counts);

  return {
    tripId: trip.id,
    userId: trip.userId,
    cluster: 0,
    profile: classification.profile,
    classifier: "decision-tree",
    classificationConfidence: classification.confidence,
    decisionTreeDepth: classification.depth,
    decisionRuleCount: classification.evaluatedRules,
    decisionPath: classification.path,
    silhouetteScore: 0,
    clusterDistance: 0,
    clusterLabel: clusterLabel(vectorFromCounts(counts)),
    clusterCentroid: centroidRecord(vectorFromCounts(counts)),
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
    const cluster = clusters.get(feature.trip.id) ?? {
      cluster: 0,
      silhouetteScore: 0,
      centroid: feature.vector,
      distanceToCentroid: 0,
      label: clusterLabel(feature.vector),
    };
    const classification = classifyWithDecisionTree(feature.counts);

    return {
      tripId: feature.trip.id,
      userId: feature.trip.userId,
      cluster: cluster.cluster,
      profile: classification.profile,
      classifier: "decision-tree" as const,
      classificationConfidence: classification.confidence,
      decisionTreeDepth: classification.depth,
      decisionRuleCount: classification.evaluatedRules,
      decisionPath: classification.path,
      silhouetteScore: cluster.silhouetteScore,
      clusterDistance: cluster.distanceToCentroid,
      clusterLabel: cluster.label,
      clusterCentroid: centroidRecord(cluster.centroid),
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
  const hasPersonalizedAnalysis = Boolean(analysis);
  const demandByDestination = new Map(calculateDestinationDemand(data).map((demand) => [demand.destinationId, demand]));

  return data.destinations
    .filter((destination) => !visited.has(destination.id))
    .map((destination) => {
      const demand = demandByDestination.get(destination.id);
      const profileScore = profileMatchesCategory(profile, destination.category) ? 28 : 8;
      const clusterScore = analysis ? Math.round((analysis.clusterCentroid[destination.category] / 100) * 24) : 0;
      const unvisitedScore = 20;
      const distanceScore = latestPoint ? Math.max(0, 22 - distanceKm(latestPoint, destination) * 1.2) : 12;
      const movementScore = demand ? Math.round(demand.popularityScore * 0.2) : 0;
      const scoreBreakdown = {
        profileFit: profileScore,
        clusterPattern: clusterScore,
        movementDemand: movementScore,
        proximity: Math.round(distanceScore),
        unvisited: unvisitedScore,
      };
      const score = Math.min(
        100,
        scoreBreakdown.profileFit + scoreBreakdown.clusterPattern + scoreBreakdown.unvisited + scoreBreakdown.proximity + scoreBreakdown.movementDemand
      );
      const reason =
        !hasPersonalizedAnalysis
          ? "Fallback suggestion shown because the movement history is still too limited for a personalised AI result."
          : clusterScore >= 12
          ? `Matches the ${profile} travel profile and the strongest K-Means cluster pattern from the tourist route.`
          : demand && demand.tier !== "low"
          ? `Matches the ${profile} travel profile and has strong movement demand from recorded tourist routes.`
          : profile === "mixed"
          ? "Matches a balanced movement profile and has not been visited in the current history."
          : `Matches the ${profile} travel profile and has not been visited in the current history.`;

      return {
        id: createId("recommendation"),
        userId,
        destinationId: destination.id,
        score,
        scoreBreakdown,
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

function emptyConfusionMatrix(): Record<TouristProfile, Record<TouristProfile, number>> {
  const profiles: TouristProfile[] = ["cultural", "nature", "urban", "mixed"];
  return Object.fromEntries(profiles.map((actual) => [actual, Object.fromEntries(profiles.map((predicted) => [predicted, 0]))])) as Record<
    TouristProfile,
    Record<TouristProfile, number>
  >;
}

export function evaluateAiOutput(data: AppData): AiEvaluation {
  const analyses = analyzeAllTrips(data);
  const matrix = emptyConfusionMatrix();
  let labelledRecordCount = 0;
  let correctClassificationCount = 0;

  analyses.forEach((analysis) => {
    const expectedProfile = data.users.find((user) => user.id === analysis.userId)?.expectedProfile;
    if (!expectedProfile) {
      return;
    }

    labelledRecordCount += 1;
    matrix[expectedProfile][analysis.profile] += 1;
    if (expectedProfile === analysis.profile) {
      correctClassificationCount += 1;
    }
  });

  const completedTrips = data.trips.filter((trip) => trip.status === "completed");
  const insufficientTripCount = completedTrips.filter((trip) => data.points.filter((point) => point.tripId === trip.id).length < 2).length;
  const averageSilhouetteScore =
    analyses.length === 0 ? 0 : Number((analyses.reduce((sum, analysis) => sum + analysis.silhouetteScore, 0) / analyses.length).toFixed(2));

  return {
    generatedAt: new Date().toISOString(),
    labelledRecordCount,
    correctClassificationCount,
    classificationAccuracy: labelledRecordCount === 0 ? 0 : Number((correctClassificationCount / labelledRecordCount).toFixed(2)),
    averageSilhouetteScore,
    validClusteredRecordCount: analyses.length,
    insufficientTripCount,
    confusionMatrix: matrix,
  };
}

function normalizeTravelPlanOptions(options: TravelPlanOptions = {}): Required<TravelPlanOptions> {
  return {
    audience: options.audience ?? "movement",
    city: options.city?.trim() || "all",
    maxStops: Math.min(8, Math.max(1, Math.round(options.maxStops ?? 5))),
    minimumTier: options.minimumTier ?? "emerging",
    diversifyCategories: options.diversifyCategories ?? true,
  };
}

function travelPlanAudienceBonus(audience: Required<TravelPlanOptions>["audience"], destination: Destination) {
  if (audience === "movement" || audience === "mixed") {
    return 0;
  }

  return profileMatchesCategory(audience, destination.category) ? 30 : -8;
}

export function createMovementBasedTravelPlan(data: AppData, options?: TravelPlanOptions): TravelPlan {
  const criteria = normalizeTravelPlanOptions(options);
  const demandRows = calculateDestinationDemand(data);
  const selectedDestinationIds = new Set<string>();
  const selectedCategories = new Set<DestinationCategory>();
  const candidates = demandRows
    .map((row) => {
      const destination = data.destinations.find((candidate) => candidate.id === row.destinationId);
      return destination
        ? {
            row,
            destination,
            planScore: row.popularityScore + travelPlanAudienceBonus(criteria.audience, destination),
          }
        : null;
    })
    .filter((candidate): candidate is { row: DestinationDemand; destination: Destination; planScore: number } => Boolean(candidate))
    .filter(({ row, destination }) => row.popularityScore > 0 && demandTierWeight[row.tier] >= demandTierWeight[criteria.minimumTier] && (criteria.city === "all" || destination.city === criteria.city))
    .sort((a, b) => b.planScore - a.planScore || b.row.popularityScore - a.row.popularityScore);

  const selected: typeof candidates = [];

  candidates.forEach((candidate) => {
    if (selected.length >= criteria.maxStops || selectedDestinationIds.has(candidate.row.destinationId)) {
      return;
    }

    const categoryAlreadySelected = selectedCategories.has(candidate.destination.category);
    const remainingNewCategoryExists = candidates.some(
      (other) =>
        !selectedDestinationIds.has(other.row.destinationId) &&
        !selectedCategories.has(other.destination.category) &&
        other.destination.category !== candidate.destination.category
    );

    if (criteria.diversifyCategories && categoryAlreadySelected && remainingNewCategoryExists) {
      return;
    }

    selected.push(candidate);
    selectedDestinationIds.add(candidate.row.destinationId);
    selectedCategories.add(candidate.destination.category);
  });

  if (selected.length < criteria.maxStops) {
    candidates.forEach((candidate) => {
      if (selected.length < criteria.maxStops && !selectedDestinationIds.has(candidate.row.destinationId)) {
        selected.push(candidate);
        selectedDestinationIds.add(candidate.row.destinationId);
      }
    });
  }

  const audienceText = criteria.audience === "movement" ? "overall movement demand" : `${criteria.audience} tourist patterns`;
  const cityText = criteria.city === "all" ? "all prototype cities" : criteria.city;

  return {
    title: "Movement-Based Suggested Route",
    generatedAt: new Date().toISOString(),
    summary:
      selected.length === 0
        ? `No destinations match the selected ${criteria.minimumTier} demand threshold for ${cityText}.`
        : `Suggested route for ${audienceText}, filtered to ${cityText}, using ${criteria.minimumTier}+ movement demand signals.`,
    criteria,
    stops: selected.map(({ row, destination, planScore }, index) => {
      return {
        destinationId: row.destinationId,
        order: index + 1,
        reason: `${row.tier} demand, planning score ${Math.max(0, Math.round(planScore))}: ${row.movementPointCount} nearby points, ${row.recentPointCount} recent points, and ${row.approachSignalCount} approach signal(s) from ${Math.max(row.uniqueTouristCount, row.approachingTouristCount)} tourist profile(s).`,
        suggestedMinutes: destination.averageVisitMinutes,
      };
    }),
  };
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTravelPlanCsv(plan: TravelPlan, data: AppData) {
  const header = ["order", "destination", "city", "category", "suggested_minutes", "reason"];
  const rows = plan.stops.map((stop) => {
    const destination = data.destinations.find((candidate) => candidate.id === stop.destinationId);

    return [
      stop.order,
      destination?.name ?? "Unknown destination",
      destination?.city ?? "",
      destination?.category ?? "",
      stop.suggestedMinutes,
      stop.reason,
    ];
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function buildMovementAlertsCsv(alerts: MovementAlert[], data: AppData) {
  const header = ["destination", "city", "severity", "score", "message", "recommended_action", "generated_at"];
  const rows = alerts.map((alert) => {
    const destination = data.destinations.find((candidate) => candidate.id === alert.destinationId);

    return [
      destination?.name ?? "Unknown destination",
      destination?.city ?? "",
      alert.severity,
      alert.score,
      alert.message,
      alert.recommendedAction,
      alert.generatedAt,
    ];
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
