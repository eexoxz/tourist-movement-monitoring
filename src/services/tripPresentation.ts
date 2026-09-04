import type { AnalysisResult, Destination, MovementPoint, TripSession, TripSummary } from "../types";
import type { TranslationKey } from "./i18n";
import { nearestDestination } from "./geo";

export function getRecognizedDestinationNames(points: MovementPoint[], destinations: Destination[]) {
  const names = points
    .map((point) => {
      const nearest = nearestDestination(point, destinations);
      return nearest && nearest.distance <= 1.2 ? nearest.destination.name : null;
    })
    .filter((name): name is string => Boolean(name));

  return Array.from(new Set(names));
}

export function formatTripTitle(trip: TripSession, destinationNames: string[], t: (key: TranslationKey) => string) {
  const routeLabel = destinationNames.slice(0, 2).join(" to ");

  if (routeLabel) {
    return `${routeLabel} ${t("tourist.trips.tripSuffix")}`;
  }

  return trip.status === "active" ? t("tourist.trips.currentTripTitle") : t("tourist.trips.malaysiaTripTitle");
}

export function getTripDiaryInsight(summary: TripSummary, destinationNames: string[], t: (key: TranslationKey) => string) {
  if (summary.pointCount < 2) {
    return t("tourist.trips.insightRecording");
  }

  if (destinationNames.length > 0) {
    const aroundPrefix = t("tourist.trips.insightAroundPrefix");
    const names = destinationNames.slice(0, 3).join(", ");
    const separator = /[、在]$/.test(aroundPrefix) ? "" : " ";
    return `${aroundPrefix}${separator}${names}${t("tourist.trips.insightAroundSuffix")} ${t("tourist.trips.insightKnownRoute")}`;
  }

  return t("tourist.trips.insightSavedRoute");
}

export function getTripSuggestionStatus(summary: TripSummary, analysis: AnalysisResult | null, t: (key: TranslationKey) => string) {
  if (summary.pointCount < 2) {
    return t("tourist.trips.keepRecording");
  }

  return analysis ? t("tourist.trips.ready") : t("tourist.trips.refresh");
}
