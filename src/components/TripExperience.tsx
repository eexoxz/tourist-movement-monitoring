import { ArrowRight, CalendarDays, CircleCheck, Clock3, Compass, Navigation, Play, Settings2, ShieldCheck, Square } from "lucide-react";
import { distanceKm } from "../services/geo";
import { translate, type Locale } from "../services/i18n";
import { travelText } from "../services/travelExperienceCopy";
import { uiText } from "../services/uiText";
import { interfaceText } from "../services/interfaceCopy";
import type { GeoFenceWarning } from "../services/geofencing";
import type { Destination, DestinationDemand, LocationConsent, MovementPoint, TripSession, TripSummary } from "../types";
import { DestinationTeaser } from "./DestinationTeaser";
import { MovementMap } from "./MovementMap";
import { TrackingStatus } from "./TrackingStatus";

export function TripExperience({ activeTrip, consent, points, reference, gpsFix, gpsAttention, isBrowsingArea = false, destinations, nearbyPlaces, demand, summary, trackingMessage, isLiveTracking, locationRetryAvailable, geofenceWarnings, locale, syncStatus, onAllowLocation, onStart, onStartNew, onStop, onResume, onManage, onPlan, onOpenPlace, onSafety }: {
  activeTrip?: TripSession | null;
  consent?: LocationConsent | null;
  points: MovementPoint[];
  reference?: MovementPoint;
  gpsFix?: MovementPoint;
  gpsAttention?: boolean;
  isBrowsingArea?: boolean;
  destinations: Destination[];
  nearbyPlaces: Destination[];
  demand: DestinationDemand[];
  summary: TripSummary | null;
  trackingMessage: string | null;
  isLiveTracking: boolean;
  locationRetryAvailable: boolean;
  geofenceWarnings: GeoFenceWarning[];
  locale: Locale;
  syncStatus?: string;
  onAllowLocation: () => void;
  onStart: () => void;
  onStartNew?: () => void;
  onStop: () => void;
  onResume: () => void;
  onManage: () => void;
  onPlan?: () => void;
  onOpenPlace: (id: string) => void;
  onSafety: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const text = (key: Parameters<typeof travelText>[1]) => travelText(locale, key);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return <div className="trip-experience">
    <section className={`trip-recorder ${activeTrip ? isLiveTracking ? "is-recording" : "needs-location" : "is-idle"}`}>
      {activeTrip && <div className="trip-recording-state" role="status"><span aria-hidden="true" />{isLiveTracking ? interfaceText(locale, "recording") : text("pausedStatus")}</div>}
      <div className="trip-recorder-heading"><span className={isLiveTracking ? "trip-live-indicator active" : "trip-live-indicator"} aria-hidden="true"><Navigation size={24} /></span><div><h2>{text(activeTrip ? isLiveTracking ? "activeTitle" : "pausedTitle" : "idleTitle")}</h2><p>{text(activeTrip ? isLiveTracking ? "activeDescription" : "pausedDescription" : "idleDescription")}</p></div></div>
      <div className="trip-recorder-actions">
        {!consent ? <button className="primary-action" type="button" onClick={onAllowLocation}><ShieldCheck size={18} />{uiText(locale, "Allow location")}</button>
          : !activeTrip ? <button className="primary-action" type="button" onClick={onStart}><Play size={18} />{t("tourist.home.startTrip")}</button>
            : <><button className={isLiveTracking ? "primary-action" : "secondary-action"} type="button" onClick={onStop}><Square size={18} />{isLiveTracking ? t("tourist.home.stopTrip") : text("finishTrip")}</button>{(!isLiveTracking || locationRetryAvailable) && <button className={isLiveTracking ? "secondary-action" : "primary-action"} type="button" onClick={onResume}><Navigation size={18} />{t(locationRetryAvailable ? "tourist.home.tryLocationAgain" : "tourist.home.resumeTracking")}</button>}{!isLiveTracking && onStartNew && <button className="secondary-action" type="button" onClick={onStartNew}><Play size={18} />{text("startNewTrip")}</button>}</>}
        <button className="secondary-action" type="button" onClick={onManage}><Settings2 size={18} />{text("manage")}</button>
        {onPlan && <button className="secondary-action" type="button" onClick={onPlan}><CalendarDays size={18} />{text("itinerary")}</button>}
        <button className="secondary-action trip-safety-action" type="button" onClick={onSafety}><ShieldCheck size={18} />{t("tourist.safety.eyebrow")}</button>
      </div>
      {activeTrip && <TrackingStatus point={points.at(-1)} fix={gpsFix} attention={gpsAttention || locationRetryAvailable} listening={isLiveTracking} syncStatus={syncStatus} locale={locale} />}
      {trackingMessage && (activeTrip && isLiveTracking && !locationRetryAvailable ? <details className="trip-location-status"><summary>{text("privacy")}</summary><p>{uiText(locale, trackingMessage)}</p></details> : <p className="status-message" role="status">{uiText(locale, trackingMessage)}</p>)}
      {activeTrip && summary && <dl className="trip-current-summary"><div><dt><Navigation size={16} />{t("common.distance")}</dt><dd>{number.format(summary.distanceKm)} <small>km</small></dd></div><div><dt><Clock3 size={16} />{text("recordedTime")}</dt><dd>{number.format(summary.durationMinutes)} <small>{t("common.minutes")}</small></dd></div><div><dt><CircleCheck size={16} />{t("tourist.completed.recognisedStops")}</dt><dd>{number.format(summary.visitedDestinationCount)}</dd></div></dl>}
      {activeTrip && points.some((point) => point.source === "demo") && <small className="trip-sample-notice">{text("sampleNote")}</small>}
    </section>

    <div className="trip-live-map"><MovementMap points={activeTrip ? points : []} destinations={destinations} activePoint={reference} isBrowsingArea={isBrowsingArea} mode="tourist" displayMode={activeTrip ? "route" : "signals"} locale={locale} activityDemand={demand} /></div>

    {geofenceWarnings.length > 0 && <section className="trip-area-guidance" aria-live="polite">{geofenceWarnings.map(({ geofence }) => <aside key={geofence.id}><ShieldCheck size={20} aria-hidden="true" /><div><strong>{uiText(locale, geofence.name)}</strong><p>{uiText(locale, geofence.message)}</p><small>{uiText(locale, geofence.recommendedAction)}</small></div></aside>)}</section>}

    {nearbyPlaces.length > 0 && <section><div className="section-heading"><h2><Compass size={22} aria-hidden="true" />{text(activeTrip ? "alongRoute" : "places")}</h2></div><div className="travel-place-grid">{nearbyPlaces.slice(0, 2).map((place) => <DestinationTeaser key={place.id} destination={place} locale={locale} distance={reference && !isBrowsingArea ? `${number.format(distanceKm(reference, place))} km` : undefined} onOpen={onOpenPlace} />)}</div></section>}
    <button className="trip-manage-link" type="button" onClick={onManage}><Settings2 size={20} />{text("manage")}<ArrowRight size={18} /></button>
  </div>;
}
