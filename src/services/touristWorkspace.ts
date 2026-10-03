import type { AnalysisResult, AppData, AttractionCheckIn, MovementPoint, Recommendation, SosAlert, IncidentReport, TripSession, TripSummary } from "../types";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex, type DestinationSpatialIndex } from "./destinationSpatialIndex";
import { getRecognizedDestinationNames } from "./tripPresentation";
import { compareTimeAsc, compareTimeDesc, minutesBetween, timeValue } from "./time";
import { filterQualityMovementPoints, isContinuousMovementSegment } from "./movementQuality";
import { getRecordedStopIds } from "./stopEvidence";

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

function summarizeTripFromPoints(trip: TripSession, points: MovementPoint[], destinationIndex: DestinationSpatialIndex, checkIns: AttractionCheckIn[]): TripSummary {
  const visitedDestinationIds = getRecordedStopIds(points, destinationIndex);
  checkIns.filter((checkIn) => checkIn.tripId === trip.id && checkIn.userId === trip.userId).forEach((checkIn) => visitedDestinationIds.add(checkIn.destinationId));
  let distance = 0;
  let accuracyTotal = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    accuracyTotal += point.accuracyMeters;

    if (index > 0 && isContinuousMovementSegment(points[index - 1], point)) {
      distance += distanceKm(points[index - 1], point);
    }

  }

  const startedAt = points[0]?.recordedAt ?? trip.startedAt;
  const endedAt = points.at(-1)?.recordedAt ?? trip.endedAt ?? startedAt;
  const durationMinutes = minutesBetween(startedAt, endedAt);
  const averageAccuracyMeters = points.length === 0 ? 0 : Math.round(accuracyTotal / points.length);

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
  let latest: T | undefined;
  let latestTime = Number.NEGATIVE_INFINITY;

  items.forEach((item) => {
    const itemTime = timeValue(getDate(item));
    if (!latest || itemTime > latestTime) {
      latest = item;
      latestTime = itemTime;
    }
  });

  return latest;
}

export function getTouristWorkspaceData(data: AppData, userId: string, selectedTripId: string): TouristWorkspaceData {
  const destinationIndex = createDestinationSpatialIndex(data.destinations);
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

  const qualityPoints = filterQualityMovementPoints(data.points.filter((point) => userTripIds.has(point.tripId)));
  getRecordedStopIds(qualityPoints, destinationIndex).forEach((id) => visitedDestinationIds.add(id));
  data.checkIns.filter((checkIn) => checkIn.userId === userId).forEach((checkIn) => visitedDestinationIds.add(checkIn.destinationId));
  qualityPoints.forEach((point) => {
    if (!userTripIds.has(point.tripId)) {
      return;
    }

    pointsByTrip.get(point.tripId)?.push(point);

  });

  pointsByTrip.forEach((points) => {
    points.sort((a, b) => compareTimeAsc(a.recordedAt, b.recordedAt));
  });

  const userAnalyses: AnalysisResult[] = [];
  data.analyses.forEach((analysis) => {
    if (analysis.userId !== userId) {
      return;
    }

    userAnalyses.push(analysis);
    const current = analysesByTrip.get(analysis.tripId);
    if (!current || timeValue(analysis.generatedAt) > timeValue(current.generatedAt)) {
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

  recentCheckIns.sort((a, b) => compareTimeDesc(a.checkedOutAt ?? a.checkedInAt, b.checkedOutAt ?? b.checkedInAt));
  savedRecommendations.sort((a, b) => compareTimeDesc(a.generatedAt, b.generatedAt));

  const recentTrips = [...userTrips].sort((a, b) => compareTimeDesc(a.startedAt, b.startedAt));
  const activeTrip = userTrips.find((trip) => trip.status === "active") ?? null;
  const activePoints = activeTrip ? pointsByTrip.get(activeTrip.id) ?? [] : [];
  const tripSummaries = userTrips.map((trip) => summarizeTripFromPoints(trip, pointsByTrip.get(trip.id) ?? [], destinationIndex, data.checkIns));
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
    tripPoints: userTrips.flatMap((trip) => pointsByTrip.get(trip.id) ?? []),
    activePoints,
    latestAnalysis,
    savedRecommendations,
    recentTrips,
    tripSummaries,
    selectedTrip,
    selectedTripPoints,
    selectedTripSummary: selectedTrip ? tripSummaryById.get(selectedTrip.id) ?? null : null,
    selectedTripAnalysis: selectedTrip ? analysesByTrip.get(selectedTrip.id) ?? null : null,
    selectedTripDestinationNames: getRecognizedDestinationNames(selectedTripPoints, data.destinations, destinationIndex),
    selectedTripRecommendations: savedRecommendations.slice(0, 3),
    latestCompletedTrip,
    latestCompletedTripPoints,
    latestCompletedTripSummary: latestCompletedTrip ? tripSummaryById.get(latestCompletedTrip.id) ?? null : null,
    latestCompletedTripAnalysis: latestCompletedTrip ? analysesByTrip.get(latestCompletedTrip.id) ?? null : null,
    latestCompletedTripDestinationNames: getRecognizedDestinationNames(latestCompletedTripPoints, data.destinations, destinationIndex),
    visitedDestinationIds,
    userSosAlerts,
    userIncidentReports,
    openSafetyCount: userSosAlerts.reduce((count, record) => count + Number(record.status !== "resolved"), 0) + userIncidentReports.reduce((count, record) => count + Number(record.status !== "resolved"), 0),
    recentCheckIns: recentCheckIns.slice(0, 3),
  };
}
