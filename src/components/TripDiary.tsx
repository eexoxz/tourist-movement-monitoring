import { Archive, ArrowRight, Clock3, MapPin, MoreHorizontal, Pencil, Route } from "lucide-react";
import { tripLayoutText } from "../services/tripLayoutCopy";
import { reviewText } from "../services/reviewUpdateCopy";
import { useMemo, type ReactNode } from "react";
import { formatDateTime } from "../services/geo";
import { uiText } from "../services/uiText";
import { formatTripTitle, getRecognizedDestinationNames } from "../services/tripPresentation";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { travelText } from "../services/travelExperienceCopy";
import { createDestinationSpatialIndex } from "../services/destinationSpatialIndex";
import { discoveryRadiusKm } from "../services/discovery";
import type { Destination, DestinationDemand, MovementPoint, Recommendation, TripSession, TripSummary } from "../types";
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
  selectedTripDestinationNames: string[];
  selectedTripRecommendations: Recommendation[];
  fallbackPoints: MovementPoint[];
  destinations: Destination[];
  activityDemand?: DestinationDemand[];
  locale?: Locale;
  onSelectTrip: (tripId: string) => void;
  onViewRecommendations: () => void;
  onOpenPlace: (destinationId: string) => void;
  onRenameTrip: (trip: TripSession, fallbackTitle: string) => void;
  onDeleteTrip: (trip: TripSession, fallbackTitle: string) => void;
  itineraryComparison?: ReactNode;
};

export function TripDiary({
  trips,
  recentTrips,
  tripSummaries,
  selectedTrip,
  selectedTripPoints,
  selectedTripSummary,
  selectedTripTitle,
  selectedTripDestinationNames,
  selectedTripRecommendations,
  fallbackPoints,
  destinations,
  activityDemand,
  locale = "en",
  onSelectTrip,
  onViewRecommendations,
  onOpenPlace,
  onRenameTrip,
  onDeleteTrip,
  itineraryComparison,
}: TripDiaryProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const completedTripCount = trips.filter((trip) => trip.status === "completed").length;
  const totalDistanceKm = Number(tripSummaries.reduce((sum, summary) => sum + summary.distanceKm, 0).toFixed(1));
  const totalRecognizedStops = tripSummaries.reduce((sum, summary) => sum + summary.visitedDestinationCount, 0);
  const summaryByTripId = useMemo(() => new Map(tripSummaries.map((summary) => [summary.tripId, summary])), [tripSummaries]);
  const pointsByTripId = useMemo(() => {
    const grouped = new Map<string, MovementPoint[]>();

    fallbackPoints.forEach((point) => {
      const points = grouped.get(point.tripId) ?? [];
      points.push(point);
      grouped.set(point.tripId, points);
    });

    return grouped;
  }, [fallbackPoints]);
  const destinationNamesByTripId = useMemo(() => {
    return new Map(recentTrips.map((trip) => [trip.id, getRecognizedDestinationNames(pointsByTripId.get(trip.id) ?? [], destinations)]));
  }, [destinations, pointsByTripId, recentTrips]);
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const routeDestinations = useMemo(() => {
    const index = createDestinationSpatialIndex(destinations);
    const ids = new Set(selectedTripPoints.flatMap((point) => index.nearby(point, discoveryRadiusKm).map(({ destination }) => destination.id)));
    return destinations.filter((destination) => ids.has(destination.id));
  }, [destinations, selectedTripPoints]);

  return (
    <section className="trip-diary-page">
      <section className="trip-diary-hero">
        <div>
          <span>{t("tourist.trips.routeHistory")}</span>
          <h2>{t("tourist.trips.savedTrips")}</h2>
          <p>{travelText(locale, "historyNote")}</p>
          <p className="trip-retention-note">{reviewText(locale, "retention")}</p>
        </div>
        <div className="trip-diary-stats" aria-label={uiText(locale, "Trip diary totals")}>
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
            <MovementMap
              points={selectedTripPoints}
              destinations={routeDestinations}
              mode="tourist"
              displayMode={selectedTripPoints.length ? "route" : "signals"}
              locale={locale}
              activityDemand={activityDemand}
            />
          </div>

          {selectedTrip && selectedTripSummary ? (
            <section className="trip-story-panel">
              <header className="trip-review-heading">
                <div><span className="trip-status-badge">{selectedTrip.status === "completed" ? t("common.completed") : t("common.active")}</span><h2>{selectedTripTitle}</h2><time dateTime={selectedTrip.startedAt}>{formatDateTime(selectedTrip.startedAt, locale)}</time></div>
                <details className="trip-options" key={selectedTrip.id}><summary aria-label={tripLayoutText(locale, "options")} title={tripLayoutText(locale, "options")}><MoreHorizontal size={22} /></summary><div>
                  <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onRenameTrip(selectedTrip, selectedTripTitle); }}><Pencil size={16} />{t("tourist.trips.renameTrip")}</button>
                  <button type="button" className="danger" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); onDeleteTrip(selectedTrip, selectedTripTitle); }}><Archive size={16} />{reviewText(locale, "remove")}</button>
                </div></details>
              </header>
              <dl className="trip-review-metrics">
                <div><Route size={18} aria-hidden="true" /><dt>{t("tourist.trips.kmTravelled")}</dt><dd>{new Intl.NumberFormat(locale).format(selectedTripSummary.distanceKm)}</dd></div>
                <div><Clock3 size={18} aria-hidden="true" /><dt>{t("tourist.trips.minSpent")}</dt><dd>{new Intl.NumberFormat(locale).format(selectedTripSummary.durationMinutes)}</dd></div>
                <div><MapPin size={18} aria-hidden="true" /><dt>{t("tourist.trips.placesNoticed")}</dt><dd>{new Intl.NumberFormat(locale).format(selectedTripSummary.visitedDestinationCount)}</dd></div>
              </dl>
              <section className="trip-visited-places"><h3>{tripLayoutText(locale, "visited")}</h3><div>
                {selectedTripDestinationNames.length ? selectedTripDestinationNames.map((name) => {
                  const place = destinations.find((item) => item.name === name);
                  return place ? <button key={name} type="button" onClick={() => onOpenPlace(place.id)}><MapPin size={15} aria-hidden="true" />{name}<ArrowRight size={14} aria-hidden="true" /></button> : <span key={name}>{name}</span>;
                }) : <p>{t("tourist.trips.noSavedDestination")}</p>}
              </div></section>
              {itineraryComparison}
              <section className="trip-similar-places"><div className="trip-similar-heading"><h3>{tripLayoutText(locale, "similar")}</h3><button className="text-action" type="button" onClick={onViewRecommendations}>{t("tourist.trips.findPlaces")}<ArrowRight size={16} aria-hidden="true" /></button></div>
                <div>{selectedTripRecommendations.slice(0, 3).map((recommendation) => { const place = destinationById.get(recommendation.destinationId); return place ? <button key={recommendation.id} type="button" onClick={() => onOpenPlace(place.id)}><strong>{place.name}</strong><small>{place.city}</small><ArrowRight size={16} aria-hidden="true" /></button> : null; })}</div>
                {!selectedTripRecommendations.length && <p>{travelText(locale, "noNextPlaces")}</p>}
              </section>
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
            const summary = summaryByTripId.get(trip.id);
            const destinationNames = destinationNamesByTripId.get(trip.id) ?? [];
            const fallbackTitle = formatTripTitle(trip, destinationNames, t);

            return (
              <article className={selectedTrip?.id === trip.id ? "trip-timeline-card active" : "trip-timeline-card"} key={trip.id}>
                <button className="trip-timeline-select" type="button" onClick={() => onSelectTrip(trip.id)}>
                  <span>{trip.status === "completed" ? t("tourist.trips.completedTrip") : t("tourist.trips.activeTrip")}</span>
                  <strong>{fallbackTitle}</strong>
                  <small>{trip.endedAt ? formatDateTime(trip.endedAt, locale) : t("tourist.trips.stillActive")}</small>
                  <p>
                    {summary?.distanceKm ?? 0} km, {summary?.durationMinutes ?? 0} {t("common.minutes")}, {summary?.visitedDestinationCount ?? 0} {t("tourist.completed.recognisedStops")}
                  </p>
                </button>
                <div className="trip-card-actions">
                  <button type="button" onClick={() => onRenameTrip(trip, fallbackTitle)}>
                    <Pencil size={15} />
                    {t("tourist.trips.renameTrip")}
                  </button>
                  <button className="danger" type="button" onClick={() => onDeleteTrip(trip, fallbackTitle)}>
                    <Archive size={15} />
                    {reviewText(locale, "remove")}
                  </button>
                </div>
              </article>
            );
          })}
          {trips.length === 0 && <EmptyState text={t("tourist.trips.firstEntry")} />}
        </aside>
      </section>
    </section>
  );
}
