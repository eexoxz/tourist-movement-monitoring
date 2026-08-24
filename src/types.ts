export type UserRole = "tourist" | "admin";

export type AppView = "overview" | "tracking" | "history" | "recommendations" | "profile" | "dashboard" | "records" | "destinations" | "ai";

export type DestinationCategory =
  | "cultural"
  | "nature"
  | "urban"
  | "heritage"
  | "food"
  | "coastal";

export type TouristProfile = "cultural" | "nature" | "urban" | "mixed";

export type KMeansFeatureVector = {
  culturalProportion: number;
  natureProportion: number;
  urbanProportion: number;
  uniqueDestinations: number;
};

export type TripStatus = "active" | "completed";

export type User = {
  id: string;
  authUid?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  expectedProfile?: TouristProfile;
  travelPreferences?: DestinationCategory[];
  tripPace?: "relaxed" | "balanced" | "packed";
  travelGroup?: "solo" | "couple" | "family" | "friends";
  accessibilityPreference?: "none" | "low-walking" | "wheelchair-friendly";
  profileCompletedAt?: string;
  createdAt: string;
};

export type Destination = {
  id: string;
  name: string;
  category: DestinationCategory;
  latitude: number;
  longitude: number;
  city: string;
  description: string;
  averageVisitMinutes: number;
};

export type MovementPoint = {
  id: string;
  tripId: string;
  userId?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  recordedAt: string;
  source: "browser" | "demo";
};

export type TripSession = {
  id: string;
  userId: string;
  status: TripStatus;
  startedAt: string;
  endedAt?: string;
  consentId: string;
};

export type TripSummary = {
  tripId: string;
  pointCount: number;
  distanceKm: number;
  durationMinutes: number;
  visitedDestinationCount: number;
  averageAccuracyMeters: number;
  firstRecordedAt?: string;
  lastRecordedAt?: string;
};

export type LocationConsent = {
  id: string;
  userId: string;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
};

export type AnalysisResult = {
  tripId: string;
  userId: string;
  cluster: number;
  profile: TouristProfile;
  classifier: "decision-tree";
  classificationConfidence: number;
  decisionTreeDepth: number;
  decisionRuleCount: number;
  decisionPath: string[];
  silhouetteScore: number;
  clusterDistance: number;
  clusterLabel: string;
  kMeansInput: KMeansFeatureVector;
  kMeansCentroid: KMeansFeatureVector;
  clusterCentroid: Record<DestinationCategory, number>;
  categoryCounts: Record<DestinationCategory, number>;
  dataPointCount: number;
  method: "k-means";
  generatedAt: string;
};

export type AiEvaluation = {
  generatedAt: string;
  labelledRecordCount: number;
  correctClassificationCount: number;
  classificationAccuracy: number;
  averageSilhouetteScore: number;
  validClusteredRecordCount: number;
  insufficientTripCount: number;
  confusionMatrix: Record<TouristProfile, Record<TouristProfile, number>>;
};

export type Recommendation = {
  id: string;
  userId: string;
  destinationId: string;
  score: number;
  scoreBreakdown: {
    profileFit: number;
    clusterPattern: number;
    movementDemand: number;
    proximity: number;
    unvisited: number;
  };
  reason: string;
  generatedAt: string;
};

export type DestinationDemand = {
  destinationId: string;
  movementPointCount: number;
  uniqueTouristCount: number;
  recentPointCount: number;
  approachSignalCount: number;
  approachingTouristCount: number;
  popularityScore: number;
  tier: "high" | "medium" | "emerging" | "low";
};

export type MovementAlert = {
  id: string;
  destinationId: string;
  severity: "critical" | "watch" | "info";
  title: string;
  message: string;
  recommendedAction: string;
  score: number;
  generatedAt: string;
};

export type TravelPlanStop = {
  destinationId: string;
  order: number;
  reason: string;
  suggestedMinutes: number;
};

export type TravelPlanAudience = TouristProfile | "movement";

export type TravelPlanOptions = {
  audience?: TravelPlanAudience;
  city?: string;
  maxStops?: number;
  minimumTier?: DestinationDemand["tier"];
  diversifyCategories?: boolean;
};

export type TravelPlan = {
  title: string;
  generatedAt: string;
  summary: string;
  criteria: {
    audience: TravelPlanAudience;
    city: string;
    maxStops: number;
    minimumTier: DestinationDemand["tier"];
    diversifyCategories: boolean;
  };
  stops: TravelPlanStop[];
};

export type AppData = {
  users: User[];
  consents: LocationConsent[];
  trips: TripSession[];
  points: MovementPoint[];
  destinations: Destination[];
  analyses: AnalysisResult[];
  recommendations: Recommendation[];
};
