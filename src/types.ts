export type UserRole = "tourist" | "admin";

export type DestinationCategory =
  | "cultural"
  | "nature"
  | "urban"
  | "heritage"
  | "food"
  | "coastal";

export type TouristProfile = "cultural" | "nature" | "urban" | "mixed";

export type TripStatus = "active" | "completed";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
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
  silhouetteScore: number;
  categoryCounts: Record<DestinationCategory, number>;
  dataPointCount: number;
  method: "k-means";
  generatedAt: string;
};

export type Recommendation = {
  id: string;
  userId: string;
  destinationId: string;
  score: number;
  reason: string;
  generatedAt: string;
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
