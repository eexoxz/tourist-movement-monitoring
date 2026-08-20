import type { AppData, DestinationCategory, MovementPoint, TouristProfile, TripSession, User } from "../types";
import { nearestDestination } from "./geo";

export type MovementRecordView = {
  point: MovementPoint;
  trip: TripSession | null;
  tourist: User | null;
  nearestDestinationName: string;
  nearestDestinationCategory: DestinationCategory | null;
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

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildMovementRecordsCsv(records: MovementRecordView[]) {
  const header = ["tourist", "trip_id", "recorded_at", "latitude", "longitude", "accuracy_meters", "nearest_destination", "destination_category", "source"];
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
