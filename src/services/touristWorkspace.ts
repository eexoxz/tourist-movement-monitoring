import type { AnalysisResult, AppData, AttractionCheckIn, Destination, MovementPoint, Recommendation, SosAlert, IncidentReport, TripSession, TripSummary } from "../types";
import { distanceKm, nearestDestination } from "./geo";
import { getRecognizedDestinationNames } from "./tripPresentation";

export type TouristWorkspaceData = {
  userTrips: TripSession[];
  activeTrip: TripSession | null;
  currentConsent: AppData["consents"][number] | null;
  tripPoints: MovementPoint[];
  activePoints: MovementPoint[];
  latestAnalysis?: AnalysisResult;
  savedRecommendations: Recommendation[];
  recentTrips: TripSession[];
  tripSummaries: TripSummary[];
  selectedTrip?: TripSession;
  selectedTripPoints: MovementPoint[];
  selectedTripSummary: TripSummary | null;
  selectedTripAnalysis: AnalysisResult | null;
  selectedTripDestinationNames: string[];
  selectedTripRecommendations: Recommendation[];
  latestCompletedTrip: TripSession | null;
  latestCompletedTripPoints: MovementPoint[];
  latestCompletedTripSummary: TripSummary | null;
  latestCompletedTripAnalysis: AnalysisResult | null;
  latestCompletedTripDestinationNames: string[];
  visitedDestinationIds: Set<string>;
  userSosAlerts: SosAlert[];
  userIncidentReports: IncidentReport[];
  openSafetyCount: number;
  recentCheckIns: AppData["checkIns"];
};

function summarizeTripFromPoints(trip: TripSession, points: MovementPoint[], destinations: Destination[]): TripSummary {
  const visitedDestinationIds = new Set<string>();
  const distance = points.slice(1).reduce((total, point, index) => total + distanceKm(points[index], point), 0);

  points.forEach((point) => {
    const nearest = nearestDestination(point, destinations);
    if (nearest && nearest.distance <= 1.2) {
      visitedDestinationIds.add(nearest.destination.id);
    }
  });

  const startedAt = points[0]?.recordedAt ?? trip.startedAt;
  const endedAt = points.at(-1)?.recordedAt ?? trip.endedAt ?? startedAt;
  const durationMinutes = startedAt && endedAt ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)) : 0;
  const averageAccuracyMeters = points.length === 0 ? 0 : Math.round(points.reduce((total, point) => total + point.accuracyMeters, 0) / points.length);

  return {
    tripId: trip.id,
    pointCount: points.length,
    distanceKm: Number(distance.toFixed(2)),
    durationMinutes,
    visitedDestinationCount: visitedDestinationIds.size,
    averageAccuracyMeters,
    firstRecordedAt: points[0]?.recordedAt,
    lastRecordedAt: points.at(-1)?.recordedAt,
  };
}

function latestByDate<T>(items: T[], getDate: (item: T) => string) {
  return items.reduce<T | undefined>((latest, item) => (!latest || new Date(getDate(item)).getTime() > new Date(getDate(latest)).getTime() ? item : latest), undefined);
}

export function getTouristWorkspaceData(data: AppData, userId: string, selectedTripId: string): TouristWorkspaceData {
  const userTrips: TripSession[] = [];
  const pointsByTrip = new Map<string, MovementPoint[]>();
  const visitedDestinationIds = new Set<string>();
  const analysesByTrip = new Map<string, AnalysisResult>();
  const savedRecommendations: Recommendation[] = [];
  const userSosAlerts: SosAlert[] = [];
  const userIncidentReports: IncidentReport[] = [];
  const recentCheckIns: AttractionCheckIn[] = [];

  data.trips.forEach((trip) => {
    if (trip.userId === userId) {
      userTrips.push(trip);
      pointsByTrip.set(trip.id, []);
    }
  });

  const userTripIds = new Set(userTrips.map((trip) => trip.id));

  data.points.forEach((point) => {
    if (!userTripIds.has(point.tripId)) {
      return;
    }

    pointsByTrip.get(point.tripId)?.push(point);

    const nearest = nearestDestination(point, data.destinations);
    if (nearest && nearest.distance <= 1.2) {
      visitedDestinationIds.add(nearest.destination.id);
    }
  });

  pointsByTrip.forEach((points) => {
    points.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  });

  const userAnalyses = data.analyses.filter((analysis) => analysis.userId === userId);
  userAnalyses.forEach((analysis) => {
    const current = analysesByTrip.get(analysis.tripId);
    if (!current || new Date(analysis.generatedAt).getTime() > new Date(current.generatedAt).getTime()) {
      analysesByTrip.set(analysis.tripId, analysis);
    }
  });

  data.recommendations.forEach((recommendation) => {
    if (recommendation.userId === userId) {
      savedRecommendations.push(recommendation);
    }
  });

  data.sosAlerts.forEach((alert) => {
    if (alert.userId === userId) {
      userSosAlerts.push(alert);
    }
  });

  data.incidentReports.forEach((report) => {
    if (report.userId === userId) {
      userIncidentReports.push(report);
    }
  });

  data.checkIns.forEach((checkIn) => {
    if (checkIn.userId === userId) {
      recentCheckIns.push(checkIn);
    }
  });

  recentCheckIns.sort((a, b) => new Date(b.checkedOutAt ?? b.checkedInAt).getTime() - new Date(a.checkedOutAt ?? a.checkedInAt).getTime());
  savedRecommendations.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  const recentTrips = [...userTrips].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const activeTrip = userTrips.find((trip) => trip.status === "active") ?? null;
  const activePoints = activeTrip ? pointsByTrip.get(activeTrip.id) ?? [] : [];
  const tripSummaries = userTrips.map((trip) => summarizeTripFromPoints(trip, pointsByTrip.get(trip.id) ?? [], data.destinations));
  const tripSummaryById = new Map(tripSummaries.map((summary) => [summary.tripId, summary]));
  const selectedTrip = userTrips.find((trip) => trip.id === selectedTripId) ?? recentTrips[0];
  const selectedTripPoints = selectedTrip ? pointsByTrip.get(selectedTrip.id) ?? [] : [];
  const latestCompletedTrip = recentTrips.find((trip) => trip.status === "completed") ?? null;
  const latestCompletedTripPoints = latestCompletedTrip ? pointsByTrip.get(latestCompletedTrip.id) ?? [] : [];
  const latestAnalysis = latestByDate(userAnalyses, (analysis) => analysis.generatedAt);

  return {
    userTrips,
    activeTrip,
    currentConsent: data.consents.find((consent) => consent.userId === userId && consent.granted) ?? null,
    tripPoints: Array.from(pointsByTrip.values()).flat(),
    activePoints,
    latestAnalysis,
    savedRecommendations,
    recentTrips,
    tripSummaries,
    selectedTrip,
    selectedTripPoints,
    selectedTripSummary: selectedTrip ? tripSummaryById.get(selectedTrip.id) ?? null : null,
    selectedTripAnalysis: selectedTrip ? analysesByTrip.get(selectedTrip.id) ?? null : null,
    selectedTripDestinationNames: getRecognizedDestinationNames(selectedTripPoints, data.destinations),
    selectedTripRecommendations: savedRecommendations.slice(0, 3),
    latestCompletedTrip,
    latestCompletedTripPoints,
    latestCompletedTripSummary: latestCompletedTrip ? tripSummaryById.get(latestCompletedTrip.id) ?? null : null,
    latestCompletedTripAnalysis: latestCompletedTrip ? analysesByTrip.get(latestCompletedTrip.id) ?? null : null,
    latestCompletedTripDestinationNames: getRecognizedDestinationNames(latestCompletedTripPoints, data.destinations),
    visitedDestinationIds,
    userSosAlerts,
    userIncidentReports,
    openSafetyCount: [...userSosAlerts, ...userIncidentReports].filter((record) => record.status !== "resolved").length,
    recentCheckIns: recentCheckIns.slice(0, 3),
  };
}
