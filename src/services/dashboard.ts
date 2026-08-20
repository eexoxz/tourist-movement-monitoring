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

export function getMovementRecords(data: AppData, selectedTouristId = "all"): MovementRecordView[] {
  const visibleTrips = selectedTouristId === "all" ? data.trips : data.trips.filter((trip) => trip.userId === selectedTouristId);
  const visibleTripIds = new Set(visibleTrips.map((trip) => trip.id));

  return data.points
    .filter((point) => visibleTripIds.has(point.tripId))
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
