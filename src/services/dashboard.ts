import type { AnalysisResult, AppData, DestinationCategory, MalaysianState, MovementPoint, TouristProfile, TripSession, TripSummary, User } from "../types";
import { getDestinationState } from "./destinationState";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex, type DestinationSpatialIndex } from "./destinationSpatialIndex";
import { compareTimeAsc, compareTimeDesc, timeValue } from "./time";
import { isContinuousMovementSegment, recordedMovementMinutes } from "./movementQuality";

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

export type MovementRecordFilters = {
  touristId?: string;
  tripId?: string;
  tripIds?: ReadonlySet<string>;
  state?: MalaysianState | "all" | "unmatched";
  fromDate?: string;
  toDate?: string;
};

export type MovementDashboardViews = {
  records: MovementRecordView[];
  tripRecords: MovementTripRecordView[];
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

  if (isWithinDateRange(trip.startedAt, filters) || (trip.endedAt && isWithinDateRange(trip.endedAt, filters))) {
    return true;
  }

  return points.some((point) => isWithinDateRange(point.recordedAt, filters));
}

function buildDashboardIndexes(data: AppData) {
  const pointsByTrip = new Map<string, MovementPoint[]>();
  const pointTimes = new Map(data.points.map((point) => [point, timeValue(point.recordedAt)]));
  const destinationIndex = createDestinationSpatialIndex(data.destinations);
  const nearestByPoint = new Map<MovementPoint, ReturnType<DestinationSpatialIndex["nearest"]>>();
  const nearestPlace = (point: MovementPoint) => {
    if (!nearestByPoint.has(point)) nearestByPoint.set(point, destinationIndex.nearest(point, 1.2));
    return nearestByPoint.get(point);
  };

  const statesByPoint = new Map<MovementPoint, MalaysianState | undefined>();
  const pointMatchesState = (point: MovementPoint, state: MovementRecordFilters["state"]) => {
    if (!state || state === "all") return true;
    if (!statesByPoint.has(point)) {
      const nearest = nearestPlace(point);
      statesByPoint.set(point, nearest ? getDestinationState(nearest.destination) : undefined);
    }
    const matchedState = statesByPoint.get(point);
    return state === "unmatched" ? !matchedState : matchedState === state;
  };

  data.points.forEach((point) => {
    const tripPoints = pointsByTrip.get(point.tripId) ?? [];
    tripPoints.push(point);
    pointsByTrip.set(point.tripId, tripPoints);
  });

  pointsByTrip.forEach((points) => {
    points.sort((a, b) => pointTimes.get(a)! - pointTimes.get(b)!);
  });

  return {
    tripById: new Map(data.trips.map((trip) => [trip.id, trip])),
    userById: new Map(data.users.map((user) => [user.id, user])),
    analysisByTripId: new Map(data.analyses.map((analysis) => [analysis.tripId, analysis])),
    destinationIndex, nearestPlace, pointMatchesState, pointTimes,
    pointsByTrip,
    tripEvidence: new Map<string, { summary: TripSummary; destinationNames: string[] }>(),
  };
}

type DashboardIndexes = ReturnType<typeof buildDashboardIndexes>;

function summarizeTripPoints(trip: TripSession, points: MovementPoint[], nearestPlace: DashboardIndexes["nearestPlace"]): { summary: TripSummary; destinationNames: string[] } {
  const visitedDestinationIds = new Set<string>();
  const destinationNames = new Set<string>();
  let distance = 0;
  let accuracyTotal = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    accuracyTotal += point.accuracyMeters;

    if (index > 0 && isContinuousMovementSegment(points[index - 1], point)) {
      distance += distanceKm(points[index - 1], point);
    }

    const nearest = nearestPlace(point);
    if (nearest) {
      visitedDestinationIds.add(nearest.destination.id);
      destinationNames.add(nearest.destination.name);
    }
  }

  const durationMinutes = recordedMovementMinutes(points);
  const averageAccuracyMeters = points.length === 0 ? 0 : Math.round(accuracyTotal / points.length);

  return {
    summary: {
      tripId: trip.id,
      pointCount: points.length,
      distanceKm: Number(distance.toFixed(2)),
      durationMinutes,
      visitedDestinationCount: visitedDestinationIds.size,
      averageAccuracyMeters,
      firstRecordedAt: points[0]?.recordedAt,
      lastRecordedAt: points.at(-1)?.recordedAt,
    },
    destinationNames: [...destinationNames],
  };
}

function getMovementRecordsWithIndexes(data: AppData, filters: MovementRecordFilters, indexes: DashboardIndexes): MovementRecordView[] {
  const visibleTrips =
    filters.touristId && filters.touristId !== "all"
      ? data.trips.filter((trip) => trip.userId === filters.touristId)
      : data.trips;
  const visibleTripIds = new Set(visibleTrips.filter((trip) => !filters.tripIds || filters.tripIds.has(trip.id)).map((trip) => trip.id));

  return data.points
    .filter((point) => visibleTripIds.has(point.tripId))
    .filter((point) => !filters.tripId || filters.tripId === "all" || point.tripId === filters.tripId)
    .filter((point) => isWithinDateRange(point.recordedAt, filters) && indexes.pointMatchesState(point, filters.state))
    .map((point) => {
      const trip = indexes.tripById.get(point.tripId) ?? null;
      const tourist = trip ? indexes.userById.get(trip.userId) ?? null : null;
      const nearest = indexes.nearestPlace(point);

      return {
        point,
        trip,
        tourist,
        nearestDestinationName: nearest?.destination.name ?? "Unmapped destination",
        nearestDestinationCategory: nearest?.destination.category ?? null,
      };
    })
    .sort((a, b) => indexes.pointTimes.get(b.point)! - indexes.pointTimes.get(a.point)!);
}

export function getMovementRecords(data: AppData, filters: MovementRecordFilters | string = {}): MovementRecordView[] {
  const normalized = normalizeMovementFilters(filters);
  return getMovementRecordsWithIndexes(data, normalized, buildDashboardIndexes(data));
}

function getMovementTripRecordsWithIndexes(data: AppData, filters: MovementRecordFilters, indexes: DashboardIndexes): MovementTripRecordView[] {
  return data.trips
    .filter((trip) => !filters.touristId || filters.touristId === "all" || trip.userId === filters.touristId)
    .filter((trip) => !filters.tripId || filters.tripId === "all" || trip.id === filters.tripId)
    .filter((trip) => !filters.tripIds || filters.tripIds.has(trip.id))
    .filter((trip) => tripMatchesDateRange(trip, indexes.pointsByTrip.get(trip.id) ?? [], filters))
    .filter((trip) => {
      if (!filters.state || filters.state === "all") return true;
      const points = indexes.pointsByTrip.get(trip.id) ?? [];
      // State and date must match the same reading. Detail still shows the full route.
      return points.length === 0 ? filters.state === "unmatched" : points.some((point) =>
        isWithinDateRange(point.recordedAt, filters) && indexes.pointMatchesState(point, filters.state));
    })
    .map((trip) => {
      const points = indexes.pointsByTrip.get(trip.id) ?? [];
      let evidence = indexes.tripEvidence.get(trip.id);
      if (!evidence) {
        evidence = summarizeTripPoints(trip, points, indexes.nearestPlace);
        indexes.tripEvidence.set(trip.id, evidence);
      }

      return {
        trip,
        tourist: indexes.userById.get(trip.userId) ?? null,
        summary: evidence.summary,
        points,
        destinationNames: evidence.destinationNames,
        analysis: indexes.analysisByTripId.get(trip.id) ?? null,
      };
    })
    .sort((a, b) => compareTimeDesc(a.trip.startedAt, b.trip.startedAt));
}

export function getMovementTripRecords(data: AppData, filters: MovementRecordFilters | string = {}): MovementTripRecordView[] {
  const normalized = normalizeMovementFilters(filters);
  return getMovementTripRecordsWithIndexes(data, normalized, buildDashboardIndexes(data));
}

export function getMovementDashboardViews(data: AppData, filters: MovementRecordFilters | string = {}): MovementDashboardViews {
  const normalized = normalizeMovementFilters(filters);
  const indexes = buildDashboardIndexes(data);

  return {
    records: getMovementRecordsWithIndexes(data, normalized, indexes),
    tripRecords: getMovementTripRecordsWithIndexes(data, normalized, indexes),
  };
}

export function createMovementDashboardSelector() {
  let previous: AppData | undefined;
  let indexes: DashboardIndexes;
  const inputs = ["points", "trips", "users", "analyses", "destinations"] as const;
  return (data: AppData, filters: MovementRecordFilters | string = {}): MovementDashboardViews => {
    if (!previous || inputs.some((key) => data[key] !== previous![key])) indexes = buildDashboardIndexes(data);
    previous = data;
    const normalized = normalizeMovementFilters(filters);
    return {
      records: getMovementRecordsWithIndexes(data, normalized, indexes),
      tripRecords: getMovementTripRecordsWithIndexes(data, normalized, indexes),
    };
  };
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
  const recordsByTrip = records.reduce<Map<string, MovementRecordView[]>>((groups, record) => {
    const tripId = record.trip?.id ?? record.point.tripId;
    const tripRecords = groups.get(tripId);

    if (tripRecords) {
      tripRecords.push(record);
      return groups;
    }

    groups.set(tripId, [record]);
    return groups;
  }, new Map());
  const summaries = new Map(
    [...recordsByTrip.entries()].map(([tripId, tripRecords]) => {
      const sortedTripRecords = [...tripRecords].sort((a, b) => compareTimeAsc(a.point.recordedAt, b.point.recordedAt));
      const distance = sortedTripRecords.slice(1).reduce((total, record, index) => total + (isContinuousMovementSegment(sortedTripRecords[index].point, record.point) ? distanceKm(sortedTripRecords[index].point, record.point) : 0), 0);
      const visited = new Set(sortedTripRecords.map((record) => record.nearestDestinationName).filter((name) => name !== "Unmapped destination"));

      return [
        tripId,
        {
          distanceKm: Number(distance.toFixed(2)),
          durationMinutes: recordedMovementMinutes(sortedTripRecords.map(record => record.point)),
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
