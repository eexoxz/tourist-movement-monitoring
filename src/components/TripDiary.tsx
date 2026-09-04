import { Sparkles } from "lucide-react";
import { formatDateTime } from "../services/geo";
import { formatTripTitle, getRecognizedDestinationNames } from "../services/tripPresentation";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { Destination, MovementPoint, Recommendation, TripSession, TripSummary } from "../types";
import { MovementMap } from "./MovementMap";
import { EmptyState } from "./SummaryCards";

type TripDiaryProps = {
  trips: TripSession[];
  recentTrips: TripSession[];
  tripSummaries: TripSummary[];
  selectedTrip?: TripSession;
  selectedTripPoints: MovementPoint[];
  selectedTripSummary: TripSummary | null;
  selectedTripTitle: string;
  selectedTripInsight: string;
  selectedTripSuggestionStatus: string;
  selectedTripDestinationNames: string[];
  selectedTripRecommendations: Recommendation[];
  fallbackPoints: MovementPoint[];
  destinations: Destination[];
  hasPersonalizedRecommendations: boolean;
  locale?: Locale;
  onSelectTrip: (tripId: string) => void;
  onViewRecommendations: () => void;
};

export function TripDiary({
  trips,
  recentTrips,
  tripSummaries,
  selectedTrip,
  selectedTripPoints,
  selectedTripSummary,
  selectedTripTitle,
  selectedTripInsight,
  selectedTripSuggestionStatus,
  selectedTripDestinationNames,
  selectedTripRecommendations,
  fallbackPoints,
  destinations,
  hasPersonalizedRecommendations,
  locale = "en",
  onSelectTrip,
  onViewRecommendations,
}: TripDiaryProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const completedTripCount = trips.filter((trip) => trip.status === "completed").length;
  const totalDistanceKm = Number(tripSummaries.reduce((sum, summary) => sum + summary.distanceKm, 0).toFixed(1));
  const totalRecognizedStops = tripSummaries.reduce((sum, summary) => sum + summary.visitedDestinationCount, 0);

  return (
    <section className="trip-diary-page">
      <section className="trip-diary-hero">
        <div>
          <span>{t("tourist.trips.routeHistory")}</span>
          <h2>{t("tourist.trips.heroTitle")}</h2>
          <p>{t("tourist.trips.heroDescription")}</p>
        </div>
        <div className="trip-diary-stats" aria-label="Trip diary totals">
          <span>
            <strong>{completedTripCount}</strong>
            {t("common.completed")}
          </span>
          <span>
            <strong>{totalDistanceKm}</strong>
            {t("tourist.trips.kmRecorded")}
          </span>
          <span>
            <strong>{totalRecognizedStops}</strong>
            {t("tourist.trips.stopsFound")}
          </span>
        </div>
      </section>

      <section className="trip-diary-layout">
        <div className="trip-diary-main">
          <div className="trip-map-panel">
            <MovementMap points={selectedTripPoints.length ? selectedTripPoints : fallbackPoints} destinations={destinations} mode="tourist" locale={locale} />
          </div>

          {selectedTrip && selectedTripSummary ? (
            <section className="trip-story-panel">
              <div className="section-heading">
                <div>
                  <span>{t("tourist.trips.selectedRoute")}</span>
                  <h2>{selectedTripTitle}</h2>
                  <p>{formatDateTime(selectedTrip.startedAt)}</p>
                </div>
                <strong className="trip-status-badge">{selectedTrip.status === "completed" ? t("common.completed") : t("common.active")}</strong>
              </div>

              <div className="trip-story-metrics">
                <span>
                  <strong>{selectedTripSummary.distanceKm}</strong>
                  {t("tourist.trips.kmTravelled")}
                </span>
                <span>
                  <strong>{selectedTripSummary.durationMinutes}</strong>
                  {t("tourist.trips.minSpent")}
                </span>
                <span>
                  <strong>{selectedTripSummary.visitedDestinationCount}</strong>
                  {t("tourist.trips.placesNoticed")}
                </span>
                <span>
                  <strong>{selectedTripSuggestionStatus}</strong>
                  {t("tourist.trips.suggestions")}
                </span>
              </div>

              <p className="trip-insight">{selectedTripInsight}</p>

              <div className="trip-stop-strip" aria-label="Recognised trip stops">
                {selectedTripDestinationNames.length > 0 ? (
                  selectedTripDestinationNames.map((name) => <span key={name}>{name}</span>)
                ) : (
                  <small>{t("tourist.trips.noSavedDestination")}</small>
                )}
              </div>

              <section className="trip-guidance-panel">
                <div>
                  <strong>{t("tourist.trips.guidanceTitle")}</strong>
                  <p>{t("tourist.trips.guidanceText")}</p>
                </div>
                <button className="secondary-action" type="button" onClick={onViewRecommendations}>
                  <Sparkles size={18} />
                  {t("tourist.trips.findPlaces")}
                </button>
              </section>

              <div className="trip-detail-recommendations">
                <strong>{hasPersonalizedRecommendations ? t("tourist.trips.personalizedNext") : t("tourist.trips.basicNext")}</strong>
                {selectedTripRecommendations.length > 0 ? (
                  selectedTripRecommendations.map((recommendation) => {
                    const destination = destinations.find((candidate) => candidate.id === recommendation.destinationId);

                    return destination ? (
                      <button className="trip-recommendation-link" type="button" key={recommendation.id} onClick={onViewRecommendations}>
                        <span>
                          {destination.name} <small>{destination.city}</small>
                        </span>
                      </button>
                    ) : null;
                  })
                ) : (
                  <p>{t("tourist.trips.needTripForRecommendations")}</p>
                )}
              </div>
            </section>
          ) : (
            <section className="trip-story-panel">
              <EmptyState text={t("tourist.trips.emptyHistory")} />
            </section>
          )}
        </div>

        <aside className="trip-timeline-panel">
          <div className="section-heading">
            <div>
              <span>{t("tourist.trips.savedTrips")}</span>
              <h2>{t("tourist.trips.pickRoute")}</h2>
              <p>{t("tourist.trips.pickRouteDescription")}</p>
            </div>
          </div>

          {recentTrips.map((trip) => {
            const summary = tripSummaries.find((row) => row.tripId === trip.id);
            const points = fallbackPoints.filter((point) => point.tripId === trip.id);
            const destinationNames = getRecognizedDestinationNames(points, destinations);

            return (
              <button className={selectedTrip?.id === trip.id ? "trip-timeline-card active" : "trip-timeline-card"} key={trip.id} type="button" onClick={() => onSelectTrip(trip.id)}>
                <span>{trip.status === "completed" ? t("tourist.trips.completedTrip") : t("tourist.trips.activeTrip")}</span>
                <strong>{formatTripTitle(trip, destinationNames, t)}</strong>
                <small>{trip.endedAt ? formatDateTime(trip.endedAt) : t("tourist.trips.stillActive")}</small>
                <p>
                  {summary?.distanceKm ?? 0} km, {summary?.durationMinutes ?? 0} min, {destinationNames.length || 0} {t("tourist.completed.recognisedStops")}
                </p>
              </button>
            );
          })}
          {trips.length === 0 && <EmptyState text={t("tourist.trips.firstEntry")} />}
        </aside>
      </section>
    </section>
  );
}
