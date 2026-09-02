import type { AppData, TouristProfile, User } from "../types";
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

export function getTouristManagementRows(data: AppData): TouristManagementRow[] {
  const grantedConsentIds = new Set(data.consents.filter((consent) => consent.granted).map((consent) => consent.userId));

  return data.users
    .filter((user) => user.role === "tourist")
    .map((tourist) => {
      const trips = data.trips.filter((trip) => trip.userId === tourist.id);
      const tripIds = new Set(trips.map((trip) => trip.id));
      const points = data.points.filter((point) => point.userId === tourist.id || tripIds.has(point.tripId));
      const analyses = data.analyses.filter((analysis) => analysis.userId === tourist.id).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
      const safetyDates = [
        ...data.sosAlerts.filter((alert) => alert.userId === tourist.id).map((alert) => alert.updatedAt),
        ...data.incidentReports.filter((report) => report.userId === tourist.id).map((report) => report.updatedAt),
      ];
      const activityDates = [
        ...trips.map((trip) => trip.endedAt ?? trip.startedAt),
        ...points.map((point) => point.recordedAt),
        ...data.checkIns.filter((checkIn) => checkIn.userId === tourist.id).map((checkIn) => checkIn.checkedOutAt ?? checkIn.checkedInAt),
        ...safetyDates,
      ].filter((date): date is string => Boolean(date));
      const destinationNames = Array.from(
        new Set(
          points
            .map((point) => {
              const nearest = nearestDestination(point, data.destinations);
              return nearest && nearest.distance <= 1.2 ? nearest.destination.name : null;
            })
            .filter((name): name is string => Boolean(name))
        )
      );

      return {
        tourist,
        consentGranted: grantedConsentIds.has(tourist.id),
        totalTrips: trips.length,
        completedTrips: trips.filter((trip) => trip.status === "completed").length,
        activeTrips: trips.filter((trip) => trip.status === "active").length,
        movementPoints: points.length,
        checkIns: data.checkIns.filter((checkIn) => checkIn.userId === tourist.id).length,
        openSafetyCases:
          data.sosAlerts.filter((alert) => alert.userId === tourist.id && alert.status !== "resolved").length +
          data.incidentReports.filter((report) => report.userId === tourist.id && report.status !== "resolved").length,
        recommendations: data.recommendations.filter((recommendation) => recommendation.userId === tourist.id).length,
        profile: analyses[0]?.profile ?? tourist.expectedProfile,
        latestActivityAt: activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
        latestDestinationNames: destinationNames.slice(0, 4),
      };
    })
    .sort((a, b) => new Date(b.latestActivityAt ?? b.tourist.createdAt).getTime() - new Date(a.latestActivityAt ?? a.tourist.createdAt).getTime());
}
