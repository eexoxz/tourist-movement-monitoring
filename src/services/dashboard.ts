import type { AnalysisResult, AppData, DestinationCategory, MovementPoint, TouristProfile, TripSession, TripSummary, User } from "../types";
import { distanceKm, nearestDestination } from "./geo";
import { summarizeTrip } from "./movement";

export type MovementRecordView = {
  point: MovementPoint;
  trip: TripSession | null;
  tourist: User | null;
  nearestDestinationName: string;
  nearestDestinationCategory: DestinationCategory | null;
};

export type MovementTripRecordView = {
  trip: TripSession;
  tourist: User | null;
  summary: TripSummary;
  points: MovementPoint[];
  destinationNames: string[];
  analysis: AnalysisResult | null;
};

export type DashboardSummary = {
  touristCount: number;
  consentedTouristCount: number;
  activeTripCount: number;
  completedTripCount: number;
  movementPointCount: number;
  destinationCount: number;
};

export type MovementDataStatus = {
  hasMovementData: boolean;
  message: string;
};

export type DemoReadinessItem = {
  id: string;
  label: string;
  value: string;
  ready: boolean;
};

export type DemoReadiness = {
  readyCount: number;
  totalCount: number;
  completionRate: number;
  items: DemoReadinessItem[];
};

export type DemoCoverageItem = {
  id: string;
  label: string;
  evidence: string;
  ready: boolean;
};

export type DemoCoverage = {
  readyCount: number;
  totalCount: number;
  completionRate: number;
  items: DemoCoverageItem[];
};

export type MovementRecordFilters = {
  touristId?: string;
  tripId?: string;
  fromDate?: string;
  toDate?: string;
};

export function getTourists(data: AppData) {
  return data.users.filter((user) => user.role === "tourist");
}

export function summarizeDashboard(data: AppData): DashboardSummary {
  const tourists = getTourists(data);
  const consentedTouristIds = new Set(data.consents.filter((consent) => consent.granted).map((consent) => consent.userId));

  return {
    touristCount: tourists.length,
    consentedTouristCount: tourists.filter((tourist) => consentedTouristIds.has(tourist.id)).length,
    activeTripCount: data.trips.filter((trip) => trip.status === "active").length,
    completedTripCount: data.trips.filter((trip) => trip.status === "completed").length,
    movementPointCount: data.points.length,
    destinationCount: data.destinations.length,
  };
}

export function getMovementDataStatus(data: AppData): MovementDataStatus {
  if (data.points.length === 0) {
    return {
      hasMovementData: false,
      message: "No tourist movement records have been collected yet. The dashboard will populate after a tourist grants consent and records a trip.",
    };
  }

  return {
    hasMovementData: true,
    message: `${data.points.length} movement records are available for monitoring and recommendation analysis.`,
  };
}

export function getDemoReadiness(data: AppData): DemoReadiness {
  const tourists = getTourists(data);
  const seededTourists = tourists.filter((tourist) => tourist.id.startsWith("tourist-seed-"));
  const demoAccounts = ["tourist-demo", "tourist-nature-demo", "tourist-cultural-demo", "tourist-urban-demo", "admin-demo"];
  const completedTrips = data.trips.filter((trip) => trip.status === "completed");
  const touristProfilesWithPreferences = tourists.filter((tourist) => tourist.travelPreferences && tourist.travelPreferences.length > 0);
  const usersWithRecommendations = new Set(data.recommendations.map((recommendation) => recommendation.userId));

  const items: DemoReadinessItem[] = [
    {
      id: "seeded-tourists",
      label: "Synthetic tourist profiles",
      value: `${seededTourists.length} seeded`,
      ready: seededTourists.length >= 100,
    },
    {
      id: "demo-accounts",
      label: "Named login accounts",
      value: `${demoAccounts.filter((id) => data.users.some((user) => user.id === id)).length}/${demoAccounts.length} available`,
      ready: demoAccounts.every((id) => data.users.some((user) => user.id === id)),
    },
    {
      id: "completed-trips",
      label: "Completed trip history",
      value: `${completedTrips.length} trips`,
      ready: completedTrips.length >= 20,
    },
    {
      id: "movement-records",
      label: "Movement records",
      value: `${data.points.length} points`,
      ready: data.points.length >= 500 && data.points.length <= 1500,
    },
    {
      id: "profile-preferences",
      label: "Tourist preferences",
      value: `${touristProfilesWithPreferences.length} profiles`,
      ready: touristProfilesWithPreferences.length >= 100,
    },
    {
      id: "ai-analyses",
      label: "AI analysis results",
      value: `${data.analyses.length} analysed trips`,
      ready: data.analyses.length >= 20,
    },
    {
      id: "recommendations",
      label: "Recommendation output",
      value: `${usersWithRecommendations.size} tourists`,
      ready: usersWithRecommendations.size >= 20,
    },
  ];
  const readyCount = items.filter((item) => item.ready).length;

  return {
    readyCount,
    totalCount: items.length,
    completionRate: Number((readyCount / items.length).toFixed(2)),
    items,
  };
}

function buildDemoCoverage(items: DemoCoverageItem[]): DemoCoverage {
  const readyCount = items.filter((item) => item.ready).length;

  return {
    readyCount,
    totalCount: items.length,
    completionRate: Number((readyCount / items.length).toFixed(2)),
    items,
  };
}

export function getRequiredDemoFlowCoverage(data: AppData): DemoCoverage {
  const tourists = getTourists(data);
  const adminExists = data.users.some((user) => user.id === "admin-demo" && user.role === "admin");
  const demoTourist = data.users.find((user) => user.id === "tourist-demo");
  const demoTouristTrips = data.trips.filter((trip) => trip.userId === demoTourist?.id);
  const recommendationTouristIds = new Set(data.recommendations.map((recommendation) => recommendation.userId));
  const touristWithThreeRecommendations = tourists.find((tourist) => data.recommendations.filter((recommendation) => recommendation.userId === tourist.id).length >= 3);
  const movementTripRecords = getMovementTripRecords(data);

  return buildDemoCoverage([
    {
      id: "tourist-register",
      label: "Tourist registers a new account",
      evidence: "Registration screen creates Firebase or local tourist records.",
      ready: true,
    },
    {
      id: "tourist-login",
      label: "Tourist verifies/logs in",
      evidence: demoTourist ? `${demoTourist.email} demo tourist exists.` : "No demo tourist account found.",
      ready: Boolean(demoTourist),
    },
    {
      id: "profile-setup",
      label: "Tourist completes or skips profile setup",
      evidence: `${tourists.filter((tourist) => tourist.profileCompletedAt || tourist.travelPreferences?.length).length} tourist profiles have preferences.`,
      ready: tourists.some((tourist) => tourist.profileCompletedAt || tourist.travelPreferences?.length),
    },
    {
      id: "location-consent",
      label: "Tourist grants location permission",
      evidence: `${data.consents.filter((consent) => consent.granted).length} consent records are prepared.`,
      ready: data.consents.some((consent) => consent.granted),
    },
    {
      id: "start-stop-trip",
      label: "Tourist starts and stops a short trip",
      evidence: `${data.trips.filter((trip) => trip.status === "completed").length} completed trips exist for demonstration.`,
      ready: data.trips.some((trip) => trip.status === "completed") && data.points.length > 0,
    },
    {
      id: "prepared-trip-route",
      label: "Tourist views a prepared previous trip route",
      evidence: `${demoTouristTrips.length} prepared trip(s) are attached to the demo tourist.`,
      ready: demoTouristTrips.some((trip) => data.points.some((point) => point.tripId === trip.id)),
    },
    {
      id: "tourist-recommendations",
      label: "Tourist sees Tourist Category and three recommendations",
      evidence: touristWithThreeRecommendations ? `${touristWithThreeRecommendations.name} has recommendation output.` : "No tourist has three recommendations yet.",
      ready: Boolean(touristWithThreeRecommendations) && data.analyses.length > 0,
    },
    {
      id: "admin-login",
      label: "Administrator logs in",
      evidence: adminExists ? "Tourism Administrator demo account exists." : "No administrator demo account found.",
      ready: adminExists,
    },
    {
      id: "admin-records",
      label: "Administrator finds the trip in Movement Records",
      evidence: `${movementTripRecords.length} trip-level movement records are visible.`,
      ready: movementTripRecords.length > 0,
    },
    {
      id: "admin-dashboard-ai",
      label: "Administrator reviews dashboard charts and AI result",
      evidence: `${data.analyses.length} AI analysis result(s) are available.`,
      ready: data.analyses.length > 0 && data.points.length > 0,
    },
    {
      id: "admin-destination-management",
      label: "Administrator adds or edits one destination",
      evidence: `${data.destinations.length} destinations are available in management.`,
      ready: data.destinations.length > 0,
    },
    {
      id: "logout",
      label: "Tourist and Administrator can log out",
      evidence: "Shared logout control clears session for both roles.",
      ready: true,
    },
  ]);
}

export function getFunctionalRequirementCoverage(data: AppData): DemoCoverage {
  const summary = summarizeDashboard(data);
  const movementTripRecords = getMovementTripRecords(data);
  const touristWithRecommendations = getTourists(data).some((tourist) => data.recommendations.filter((recommendation) => recommendation.userId === tourist.id).length >= 3);
  const hasDestinationCategories = new Set(data.destinations.map((destination) => destination.category)).size >= 3;

  return buildDemoCoverage([
    { id: "FR1", label: "FR1 Register a new account", evidence: "Tourist registration form and account creation service are implemented.", ready: true },
    { id: "FR2", label: "FR2 Log in", evidence: "Login supports Firebase mode and local demo mode.", ready: true },
    { id: "FR3", label: "FR3 Allow location access", evidence: `${data.consents.filter((consent) => consent.granted).length} granted consent record(s).`, ready: data.consents.some((consent) => consent.granted) },
    { id: "FR4", label: "FR4 Start and stop tracking", evidence: `${summary.completedTripCount} completed trip(s).`, ready: summary.completedTripCount > 0 },
    { id: "FR5", label: "FR5 View current location", evidence: `${data.points.length} location point(s) available for map display.`, ready: data.points.length > 0 },
    { id: "FR6", label: "FR6 View movement history and routes", evidence: `${movementTripRecords.length} trip route record(s).`, ready: movementTripRecords.length > 0 },
    { id: "FR7", label: "FR7 View destination information", evidence: `${data.destinations.length} Malaysian destination record(s).`, ready: data.destinations.length > 0 },
    { id: "FR8", label: "FR8 Receive travel recommendations", evidence: touristWithRecommendations ? "At least one tourist has three recommendations." : "Recommendation output is not ready.", ready: touristWithRecommendations },
    { id: "FR9", label: "FR9 Administrator login", evidence: data.users.some((user) => user.role === "admin") ? "Administrator account exists." : "No administrator account found.", ready: data.users.some((user) => user.role === "admin") },
    { id: "FR10", label: "FR10 View Tourist movement records", evidence: `${movementTripRecords.length} movement trip record(s) for admin review.`, ready: movementTripRecords.length > 0 },
    { id: "FR11", label: "FR11 Review movement trends and charts", evidence: `${data.points.length} movement point(s) feed dashboard charts.`, ready: data.points.length > 0 },
    { id: "FR12", label: "FR12 View AI analysis results", evidence: `${data.analyses.length} K-Means/Decision Tree result(s).`, ready: data.analyses.length > 0 },
    { id: "FR13", label: "FR13 Manage destination information", evidence: hasDestinationCategories ? "Destination catalogue covers multiple categories." : "Destination coverage is too narrow.", ready: data.destinations.length > 0 },
    { id: "FR14", label: "FR14 View movement summaries", evidence: `${summary.completedTripCount} completed trip summary source(s).`, ready: summary.completedTripCount > 0 },
    { id: "FT14", label: "FT14 Logout", evidence: "Shared role-aware logout control is implemented.", ready: true },
  ]);
}

function normalizeMovementFilters(filters: MovementRecordFilters | string = {}): MovementRecordFilters {
  if (typeof filters === "string") {
    return { touristId: filters };
  }

  return filters;
}

function isWithinDateRange(recordedAt: string, filters: MovementRecordFilters) {
  const dateKey = recordedAt.slice(0, 10);

  return (!filters.fromDate || dateKey >= filters.fromDate) && (!filters.toDate || dateKey <= filters.toDate);
}

function tripMatchesDateRange(trip: TripSession, points: MovementPoint[], filters: MovementRecordFilters) {
  if (!filters.fromDate && !filters.toDate) {
    return true;
  }

  const tripDates = [trip.startedAt, trip.endedAt, ...points.map((point) => point.recordedAt)].filter((date): date is string => Boolean(date));
  return tripDates.some((date) => isWithinDateRange(date, filters));
}

export function getMovementRecords(data: AppData, filters: MovementRecordFilters | string = {}): MovementRecordView[] {
  const normalized = normalizeMovementFilters(filters);
  const visibleTrips =
    normalized.touristId && normalized.touristId !== "all"
      ? data.trips.filter((trip) => trip.userId === normalized.touristId)
      : data.trips;
  const visibleTripIds = new Set(visibleTrips.map((trip) => trip.id));

  return data.points
    .filter((point) => visibleTripIds.has(point.tripId))
    .filter((point) => !normalized.tripId || normalized.tripId === "all" || point.tripId === normalized.tripId)
    .filter((point) => isWithinDateRange(point.recordedAt, normalized))
    .map((point) => {
      const trip = data.trips.find((candidate) => candidate.id === point.tripId) ?? null;
      const tourist = data.users.find((candidate) => candidate.id === trip?.userId) ?? null;
      const nearest = nearestDestination(point, data.destinations);

      return {
        point,
        trip,
        tourist,
        nearestDestinationName: nearest?.destination.name ?? "Unmapped destination",
        nearestDestinationCategory: nearest?.destination.category ?? null,
      };
    })
    .sort((a, b) => new Date(b.point.recordedAt).getTime() - new Date(a.point.recordedAt).getTime());
}

export function getTripFilterOptions(data: AppData, touristId = "all") {
  return data.trips
    .filter((trip) => touristId === "all" || trip.userId === touristId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function getMovementTripRecords(data: AppData, filters: MovementRecordFilters | string = {}): MovementTripRecordView[] {
  const normalized = normalizeMovementFilters(filters);

  return data.trips
    .filter((trip) => !normalized.touristId || normalized.touristId === "all" || trip.userId === normalized.touristId)
    .filter((trip) => !normalized.tripId || normalized.tripId === "all" || trip.id === normalized.tripId)
    .map((trip) => {
      const points = data.points.filter((point) => point.tripId === trip.id).sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
      const destinationNames = Array.from(
        new Set(
          points
            .map((point) => {
              const nearest = nearestDestination(point, data.destinations);
              return nearest && nearest.distance <= 1.2 ? nearest.destination.name : null;
            })
            .filter(Boolean)
        )
      ) as string[];

      return {
        trip,
        tourist: data.users.find((user) => user.id === trip.userId) ?? null,
        summary: summarizeTrip(data, trip.id),
        points,
        destinationNames,
        analysis: data.analyses.find((analysis) => analysis.tripId === trip.id) ?? null,
      };
    })
    .filter((record) => tripMatchesDateRange(record.trip, record.points, normalized))
    .sort((a, b) => new Date(b.trip.startedAt).getTime() - new Date(a.trip.startedAt).getTime());
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildMovementRecordsCsv(records: MovementRecordView[]) {
  const header = [
    "tourist",
    "trip_id",
    "recorded_at",
    "latitude",
    "longitude",
    "accuracy_meters",
    "nearest_destination",
    "destination_category",
    "source",
    "trip_distance_km",
    "trip_duration_minutes",
    "trip_visited_destinations",
  ];
  const summaries = new Map(
    Array.from(new Set(records.map((record) => record.trip?.id ?? record.point.tripId))).map((tripId) => {
      const tripRecords = records
        .filter((record) => (record.trip?.id ?? record.point.tripId) === tripId)
        .sort((a, b) => new Date(a.point.recordedAt).getTime() - new Date(b.point.recordedAt).getTime());
      const distance = tripRecords.slice(1).reduce((total, record, index) => total + distanceKm(tripRecords[index].point, record.point), 0);
      const startedAt = tripRecords[0]?.point.recordedAt ?? tripRecords[0]?.trip?.startedAt;
      const endedAt = tripRecords.at(-1)?.point.recordedAt ?? tripRecords[0]?.trip?.endedAt ?? startedAt;
      const visited = new Set(tripRecords.map((record) => record.nearestDestinationName).filter((name) => name !== "Unmapped destination"));

      return [
        tripId,
        {
          distanceKm: Number(distance.toFixed(2)),
          durationMinutes: startedAt && endedAt ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)) : 0,
          visitedDestinationCount: visited.size,
        },
      ] as const;
    })
  );
  const rows = records.map((record) => [
    record.tourist?.name ?? "Unknown tourist",
    record.trip?.id ?? record.point.tripId,
    record.point.recordedAt,
    record.point.latitude,
    record.point.longitude,
    record.point.accuracyMeters,
    record.nearestDestinationName,
    record.nearestDestinationCategory ?? "",
    record.point.source,
    summaries.get(record.trip?.id ?? record.point.tripId)?.distanceKm ?? 0,
    summaries.get(record.trip?.id ?? record.point.tripId)?.durationMinutes ?? 0,
    summaries.get(record.trip?.id ?? record.point.tripId)?.visitedDestinationCount ?? 0,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function getDestinationCategoryCoverage(data: AppData) {
  return data.destinations.reduce<Record<DestinationCategory, number>>(
    (totals, destination) => {
      totals[destination.category] += 1;
      return totals;
    },
    {
      cultural: 0,
      nature: 0,
      urban: 0,
      heritage: 0,
      food: 0,
      coastal: 0,
    }
  );
}

export function getProfileDistribution(data: AppData) {
  return data.analyses.reduce<Record<TouristProfile, number>>(
    (totals, analysis) => {
      totals[analysis.profile] += 1;
      return totals;
    },
    {
      cultural: 0,
      nature: 0,
      urban: 0,
      mixed: 0,
    }
  );
}

export function getDailyMovementTrend(data: AppData, dayCount = 7): Record<string, number> {
  const today = new Date();
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (dayCount - index - 1));
    const key = date.toISOString().slice(0, 10);
    return [key, 0] as const;
  });
  const trend: Record<string, number> = Object.fromEntries(days);

  data.points.forEach((point) => {
    const key = new Date(point.recordedAt).toISOString().slice(0, 10);
    if (key in trend) {
      trend[key] += 1;
    }
  });

  return trend;
}
