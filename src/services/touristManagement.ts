import type { AppData, AttractionCheckIn, MovementPoint, TouristProfile, TripSession, User } from "../types";
import { nearestDestination } from "./geo";

export type TouristManagementRow = {
  tourist: User;
  consentGranted: boolean;
  totalTrips: number;
  completedTrips: number;
  activeTrips: number;
  movementPoints: number;
  checkIns: number;
  openSafetyCases: number;
  recommendations: number;
  profile?: TouristProfile;
  latestActivityAt?: string;
  latestDestinationNames: string[];
};

function pushGroupedValue<T>(groups: Map<string, T[]>, key: string, value: T) {
  const current = groups.get(key);

  if (current) {
    current.push(value);
    return;
  }

  groups.set(key, [value]);
}

function latestDate(dates: string[]) {
  return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function addUserPoint(pointsByUser: Map<string, Map<string, MovementPoint>>, userId: string, point: MovementPoint) {
  const current = pointsByUser.get(userId);

  if (current) {
    current.set(point.id, point);
    return;
  }

  pointsByUser.set(userId, new Map([[point.id, point]]));
}

function buildTouristManagementIndexes(data: AppData) {
  const grantedConsentIds = new Set(data.consents.filter((consent) => consent.granted).map((consent) => consent.userId));
  const tripsByUser = new Map<string, TripSession[]>();
  const userIdByTripId = new Map<string, string>();
  const pointsByUser = new Map<string, Map<string, MovementPoint>>();
  const latestAnalysisByUser = new Map<string, { profile: TouristProfile; generatedAt: string }>();
  const checkInsByUser = new Map<string, AttractionCheckIn[]>();
  const checkInDatesByUser = new Map<string, string[]>();
  const safetyDatesByUser = new Map<string, string[]>();
  const openSafetyCasesByUser = new Map<string, number>();
  const recommendationsByUser = new Map<string, number>();
  const destinationNamesByUser = new Map<string, Set<string>>();

  data.trips.forEach((trip) => {
    pushGroupedValue(tripsByUser, trip.userId, trip);
    userIdByTripId.set(trip.id, trip.userId);
  });

  data.points.forEach((point) => {
    const ownerIds = new Set<string>();
    const tripOwnerId = userIdByTripId.get(point.tripId);

    if (point.userId) {
      ownerIds.add(point.userId);
    }

    if (tripOwnerId) {
      ownerIds.add(tripOwnerId);
    }

    if (ownerIds.size === 0) {
      return;
    }

    const nearest = nearestDestination(point, data.destinations);
    const destinationName = nearest && nearest.distance <= 1.2 ? nearest.destination.name : null;

    ownerIds.forEach((userId) => {
      addUserPoint(pointsByUser, userId, point);

      if (destinationName) {
        const current = destinationNamesByUser.get(userId) ?? new Set<string>();
        current.add(destinationName);
        destinationNamesByUser.set(userId, current);
      }
    });
  });

  data.analyses.forEach((analysis) => {
    const current = latestAnalysisByUser.get(analysis.userId);

    if (!current || new Date(analysis.generatedAt).getTime() > new Date(current.generatedAt).getTime()) {
      latestAnalysisByUser.set(analysis.userId, { profile: analysis.profile, generatedAt: analysis.generatedAt });
    }
  });

  data.checkIns.forEach((checkIn) => {
    pushGroupedValue(checkInsByUser, checkIn.userId, checkIn);
    pushGroupedValue(checkInDatesByUser, checkIn.userId, checkIn.checkedOutAt ?? checkIn.checkedInAt);
  });

  data.sosAlerts.forEach((alert) => {
    pushGroupedValue(safetyDatesByUser, alert.userId, alert.updatedAt);

    if (alert.status !== "resolved") {
      openSafetyCasesByUser.set(alert.userId, (openSafetyCasesByUser.get(alert.userId) ?? 0) + 1);
    }
  });

  data.incidentReports.forEach((report) => {
    pushGroupedValue(safetyDatesByUser, report.userId, report.updatedAt);

    if (report.status !== "resolved") {
      openSafetyCasesByUser.set(report.userId, (openSafetyCasesByUser.get(report.userId) ?? 0) + 1);
    }
  });

  data.recommendations.forEach((recommendation) => {
    recommendationsByUser.set(recommendation.userId, (recommendationsByUser.get(recommendation.userId) ?? 0) + 1);
  });

  return {
    grantedConsentIds,
    tripsByUser,
    pointsByUser,
    latestAnalysisByUser,
    checkInsByUser,
    checkInDatesByUser,
    safetyDatesByUser,
    openSafetyCasesByUser,
    recommendationsByUser,
    destinationNamesByUser,
  };
}

export function getTouristManagementRows(data: AppData): TouristManagementRow[] {
  const indexes = buildTouristManagementIndexes(data);

  return data.users
    .filter((user) => user.role === "tourist")
    .map((tourist) => {
      const trips = indexes.tripsByUser.get(tourist.id) ?? [];
      const points = Array.from(indexes.pointsByUser.get(tourist.id)?.values() ?? []);
      const activityDates = [
        ...trips.map((trip) => trip.endedAt ?? trip.startedAt),
        ...points.map((point) => point.recordedAt),
        ...(indexes.checkInDatesByUser.get(tourist.id) ?? []),
        ...(indexes.safetyDatesByUser.get(tourist.id) ?? []),
      ].filter((date): date is string => Boolean(date));
      const destinationNames = Array.from(indexes.destinationNamesByUser.get(tourist.id) ?? []);

      return {
        tourist,
        consentGranted: indexes.grantedConsentIds.has(tourist.id),
        totalTrips: trips.length,
        completedTrips: trips.filter((trip) => trip.status === "completed").length,
        activeTrips: trips.filter((trip) => trip.status === "active").length,
        movementPoints: points.length,
        checkIns: indexes.checkInsByUser.get(tourist.id)?.length ?? 0,
        openSafetyCases: indexes.openSafetyCasesByUser.get(tourist.id) ?? 0,
        recommendations: indexes.recommendationsByUser.get(tourist.id) ?? 0,
        profile: indexes.latestAnalysisByUser.get(tourist.id)?.profile ?? tourist.expectedProfile,
        latestActivityAt: latestDate(activityDates),
        latestDestinationNames: destinationNames.slice(0, 4),
      };
    })
    .sort((a, b) => new Date(b.latestActivityAt ?? b.tourist.createdAt).getTime() - new Date(a.latestActivityAt ?? a.tourist.createdAt).getTime());
}
