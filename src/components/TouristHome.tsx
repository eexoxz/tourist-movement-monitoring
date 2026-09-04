import { CalendarDays, Compass, MapPinned, Navigation, Play, RotateCcw, Save, ShieldCheck, Sparkles, Square, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { formatDateTime } from "../services/geo";
import { getCheckInDurationMinutes } from "../services/checkIns";
import type { GeoFenceWarning } from "../services/geofencing";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AppView, AttractionCheckIn, Destination, FestivalEvent, IncidentReport, IncidentType, LocationConsent, MovementPoint, SosAlert, TripSession, User } from "../types";
import { MovementMap } from "./MovementMap";
import { Page } from "./Page";

type IncidentOption = {
  value: IncidentType;
  labelKey: TranslationKey;
};

type TouristHomeProps = {
  displayName: string;
  tripStateLabel: string;
  activeTrip: TripSession | null | undefined;
  recentTrip: TripSession | undefined;
  currentConsent: LocationConsent | null | undefined;
  activeJourneyPoints: MovementPoint[];
  activeJourneyPoint: MovementPoint | undefined;
  destinations: Destination[];
  geofenceWarnings: GeoFenceWarning[];
  isLiveTracking: boolean;
  locationRetryAvailable: boolean;
  trackingMessage: string | null;
  userTrips: TripSession[];
  activeCheckIn: AttractionCheckIn | null;
  activeCheckInDestination: Destination | null;
  checkInDestinationId: string;
  recentCheckIns: AttractionCheckIn[];
  recommendedCheckIn: Destination | null;
  openSafetyCount: number;
  user: User;
  incidentType: IncidentType;
  incidentDescription: string;
  incidentLocationNote: string;
  incidentTypeOptions: IncidentOption[];
  userSosAlerts: SosAlert[];
  userIncidentReports: IncidentReport[];
  recommendationHeading: string;
  recommendationSupportText: string;
  topRecommendationDestination: Destination | null | undefined;
  nextFestival: FestivalEvent | null;
  topDemandDestination: Destination | null | undefined;
  locale?: Locale;
  onViewChange: (view: AppView) => void;
  onGrantConsent: () => void;
  onStartTrip: () => void;
  onStopTrip: () => void;
  onResumeLiveTracking: () => void;
  onAddDemoPoint: () => void;
  onCreateSampleRoute: () => void;
  onCheckInDestinationChange: (destinationId: string) => void;
  onStartAttractionCheckIn: () => void;
  onFinishAttractionCheckIn: () => void;
  onSendSosAlert: () => void;
  onIncidentTypeChange: (type: IncidentType) => void;
  onIncidentDescriptionChange: (value: string) => void;
  onIncidentLocationNoteChange: (value: string) => void;
  onSubmitIncidentReport: (event: FormEvent<HTMLFormElement>) => void;
};

function getIncidentTypeLabel(type: IncidentType, options: IncidentOption[], t: (key: TranslationKey) => string) {
  const option = options.find((candidate) => candidate.value === type);
  return option ? t(option.labelKey) : t("tourist.safety.incidentFallback");
}

export function TouristHome({
  displayName,
  tripStateLabel,
  activeTrip,
  recentTrip,
  currentConsent,
  activeJourneyPoints,
  activeJourneyPoint,
  destinations,
  geofenceWarnings,
  isLiveTracking,
  locationRetryAvailable,
  trackingMessage,
  userTrips,
  activeCheckIn,
  activeCheckInDestination,
  checkInDestinationId,
  recentCheckIns,
  recommendedCheckIn,
  openSafetyCount,
  user,
  incidentType,
  incidentDescription,
  incidentLocationNote,
  incidentTypeOptions,
  userSosAlerts,
  userIncidentReports,
  recommendationHeading,
  recommendationSupportText,
  topRecommendationDestination,
  nextFestival,
  topDemandDestination,
  locale = "en",
  onViewChange,
  onGrantConsent,
  onStartTrip,
  onStopTrip,
  onResumeLiveTracking,
  onAddDemoPoint,
  onCreateSampleRoute,
  onCheckInDestinationChange,
  onStartAttractionCheckIn,
  onFinishAttractionCheckIn,
  onSendSosAlert,
  onIncidentTypeChange,
  onIncidentDescriptionChange,
  onIncidentLocationNoteChange,
  onSubmitIncidentReport,
}: TouristHomeProps) {
  const t = (key: TranslationKey) => translate(locale, key);

  return (
    <Page title={displayName ? `${t("tourist.home.welcomeBack")}, ${displayName}` : t("tourist.home.planTitle")} eyebrow={t("common.tourist")}>
      <section className="tourist-home-flow">
        <section className="home-primary-grid">
          <div className="home-today-panel">
            <div className="tracking-status-card home-status-card">
              <span>{tripStateLabel}</span>
              <div>
                <h2>{activeTrip ? t("tourist.home.activeTripTitle") : recentTrip ? t("tourist.home.readyNextTripTitle") : t("tourist.home.firstTripTitle")}</h2>
                <p>
                  {activeTrip
                    ? t("tourist.home.activeTripDescription")
                    : recentTrip
                      ? t("tourist.home.readyNextTripDescription")
                      : t("tourist.home.firstTripDescription")}
                </p>
              </div>
            </div>

            <section className="mobile-trip-controls home-trip-controls">
              <div className="consent-box">
                <ShieldCheck size={22} />
                <div>
                  <strong>{currentConsent ? t("tourist.home.locationAllowed") : t("tourist.home.allowLocation")}</strong>
                  <p>{currentConsent ? t("tourist.home.locationAllowedText") : t("tourist.home.locationNeededText")}</p>
                </div>
              </div>

              {!currentConsent && (
                <button className="primary-action wide" onClick={onGrantConsent}>
                  <ShieldCheck size={18} />
                  {t("tourist.home.allowLocation")}
                </button>
              )}

              {currentConsent && (
                <div className="mobile-action-row">
                  <button className="primary-action" onClick={onStartTrip} disabled={Boolean(activeTrip)}>
                    <Play size={18} />
                    {t("tourist.home.startTrip")}
                  </button>
                  <button className="secondary-action" onClick={onStopTrip} disabled={!activeTrip}>
                    <Square size={18} />
                    {t("tourist.home.stopTrip")}
                  </button>
                </div>
              )}

              {activeTrip && !isLiveTracking && (
                <button className="secondary-action wide" onClick={onResumeLiveTracking}>
                  <Navigation size={18} />
                  {t("tourist.home.resumeTracking")}
                </button>
              )}

              {activeTrip && (
                <button className="secondary-action wide" onClick={onAddDemoPoint}>
                  {t("tourist.home.addDemoPoint")}
                </button>
              )}

              <button className="secondary-action wide" onClick={onCreateSampleRoute} disabled={Boolean(activeTrip)}>
                <Compass size={18} />
                {t("tourist.home.addSampleRoute")}
              </button>

              {trackingMessage && <p className="status-message">{trackingMessage}</p>}

              {locationRetryAvailable && activeTrip && (
                <button className="secondary-action wide" type="button" onClick={onResumeLiveTracking}>
                  <RotateCcw size={18} />
                  {t("tourist.home.tryLocationAgain")}
                </button>
              )}

              {userTrips.length === 0 && (
                <section className="new-user-guide">
                  <strong>{t("tourist.home.howItWorks")}</strong>
                  <ol>
                    <li>{t("tourist.home.stepAllowLocation")}</li>
                    <li>{t("tourist.home.stepStartTrip")}</li>
                    <li>{t("tourist.home.stepStopTrip")}</li>
                  </ol>
                </section>
              )}
            </section>
          </div>

          <div className="home-map-panel">
            <MovementMap points={activeJourneyPoints} destinations={destinations} activePoint={activeJourneyPoint} mode="tourist" locale={locale} />
          </div>
        </section>

        {geofenceWarnings.length > 0 && (
          <section className="tourist-section geofence-warning-panel">
            <div className="section-heading">
              <div>
                <span>{t("tourist.geofence.eyebrow")}</span>
                <h2>{t("tourist.geofence.title")}</h2>
                <p>{t("tourist.geofence.description")}</p>
              </div>
            </div>
            <div className="geofence-warning-list">
              {geofenceWarnings.map((warning) => (
                <article className={`geofence-warning-card ${warning.geofence.type}`} key={warning.geofence.id}>
                  <div>
                    <strong>{warning.geofence.name}</strong>
                    <span>{warning.distanceMeters} m away</span>
                  </div>
                  <p>{warning.geofence.message}</p>
                  <small>{warning.geofence.recommendedAction}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="home-quick-actions" aria-label={t("tourist.home.quickActions")}>
          <button type="button" onClick={() => onViewChange("history")}>
            <MapPinned size={18} />
            <span>
              <strong>{t("tourist.home.quickTrips")}</strong>
              <small>{t("tourist.home.quickTripsText")}</small>
            </span>
          </button>
          <button type="button" onClick={() => onViewChange("recommendations")}>
            <Sparkles size={18} />
            <span>
              <strong>{t("tourist.home.quickPlaces")}</strong>
              <small>{t("tourist.home.quickPlacesText")}</small>
            </span>
          </button>
          <button type="button" onClick={() => onViewChange("events")}>
            <CalendarDays size={18} />
            <span>
              <strong>{t("tourist.home.quickEvents")}</strong>
              <small>{t("tourist.home.quickEventsText")}</small>
            </span>
          </button>
          <button type="button" onClick={() => onViewChange("profile")}>
            <UserRound size={18} />
            <span>
              <strong>{t("tourist.home.quickProfile")}</strong>
              <small>{t("tourist.home.quickProfileText")}</small>
            </span>
          </button>
        </section>

        <section className="home-preview-grid" aria-label={t("tourist.home.nextUp")}>
          <article className="home-preview-card recommendation-preview">
            <span>{recommendationHeading}</span>
            <h2>{topRecommendationDestination?.name ?? t("tourist.home.quickPlaces")}</h2>
            <p>{recommendationSupportText}</p>
            <button className="secondary-action compact-action" type="button" onClick={() => onViewChange("recommendations")}>
              <Sparkles size={16} />
              {t("common.viewAll")}
            </button>
          </article>
          <article className="home-preview-card event-preview">
            <span>{t("tourist.home.eventsPreview")}</span>
            <h2>{nextFestival?.name ?? t("tourist.home.quickEvents")}</h2>
            <p>{t("tourist.home.eventsPreviewText")}</p>
            <button className="secondary-action compact-action" type="button" onClick={() => onViewChange("events")}>
              <CalendarDays size={16} />
              {t("common.checkEvents")}
            </button>
          </article>
          <article className="home-preview-card demand-preview">
            <span>{t("tourist.home.placesPreview")}</span>
            <h2>{topDemandDestination?.name ?? t("tourist.home.quickPlaces")}</h2>
            <p>{t("tourist.home.placesPreviewText")}</p>
            <button className="secondary-action compact-action" type="button" onClick={() => onViewChange("recommendations")}>
              <MapPinned size={16} />
              {t("tourist.home.openPlaces")}
            </button>
          </article>
        </section>

        <section className="home-support-grid">
          <details className="tourist-section home-disclosure check-in-panel" open={Boolean(activeCheckIn)}>
            <summary>
              <span>{t("tourist.home.visitTools")}</span>
              <strong>{activeCheckInDestination ? activeCheckInDestination.name : t("tourist.checkin.emptyTitle")}</strong>
            </summary>
            <div className="section-heading">
              <div>
                <span>{t("tourist.checkin.eyebrow")}</span>
                <h2>{activeCheckInDestination ? `${t("tourist.checkin.activeTitlePrefix")} ${activeCheckInDestination.name}` : t("tourist.checkin.emptyTitle")}</h2>
                <p>{activeCheckIn ? t("tourist.checkin.activeDescription") : t("tourist.checkin.emptyDescription")}</p>
              </div>
              {activeCheckIn && <strong>{getCheckInDurationMinutes(activeCheckIn)} min</strong>}
            </div>

            {!activeCheckIn && (
              <div className="check-in-control">
                <label>
                  {t("tourist.checkin.attraction")}
                  <select value={checkInDestinationId} onChange={(event) => onCheckInDestinationChange(event.target.value)}>
                    {destinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name} · {destination.city}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-action" type="button" onClick={onStartAttractionCheckIn}>
                  <MapPinned size={18} />
                  {t("tourist.checkin.checkIn")}
                </button>
              </div>
            )}

            {recommendedCheckIn && !activeCheckIn && (
              <button className="secondary-action wide" type="button" onClick={() => onCheckInDestinationChange(recommendedCheckIn.id)}>
                {t("tourist.checkin.useNearest")}: {recommendedCheckIn.name}
              </button>
            )}

            {activeCheckIn && (
              <button className="secondary-action wide" type="button" onClick={onFinishAttractionCheckIn}>
                <Square size={18} />
                {t("tourist.checkin.checkOut")}
              </button>
            )}

            <div className="check-in-history">
              {recentCheckIns.map((checkIn) => {
                const destination = destinations.find((candidate) => candidate.id === checkIn.destinationId);

                return (
                  <span key={checkIn.id}>
                    <strong>{destination?.name ?? t("tourist.checkin.unknownAttraction")}</strong>
                    {checkIn.status === "checked-out" ? `${getCheckInDurationMinutes(checkIn)} ${t("tourist.checkin.minVisit")}` : t("tourist.checkin.currentlyCheckedIn")}
                  </span>
                );
              })}
              {recentCheckIns.length === 0 && <small>{t("tourist.checkin.emptyHistory")}</small>}
            </div>
          </details>

          <details className="tourist-section home-disclosure safety-panel" open={openSafetyCount > 0}>
            <summary>
              <span>{t("tourist.safety.eyebrow")}</span>
              <strong>{openSafetyCount} {t("tourist.safety.open")}</strong>
            </summary>
            <div className="section-heading">
              <div>
                <span>{t("tourist.safety.eyebrow")}</span>
                <h2>{t("tourist.safety.title")}</h2>
                <p>{t("tourist.safety.description")}</p>
              </div>
              <strong>{openSafetyCount} {t("tourist.safety.open")}</strong>
            </div>

            <div className="safety-contact-strip">
              <div>
                <small>{t("tourist.safety.emergencyContact")}</small>
                <strong>{user.emergencyContactName || t("tourist.safety.notAdded")}</strong>
                <span>{user.emergencyContactPhone || t("tourist.safety.addInProfile")}</span>
              </div>
              <button className="secondary-action compact-action" type="button" onClick={() => onViewChange("profile")}>
                <UserRound size={16} />
                {t("tourist.safety.editContact")}
              </button>
            </div>

            <button className="primary-action danger wide" type="button" onClick={onSendSosAlert}>
              <ShieldCheck size={18} />
              {t("tourist.safety.sos")}
            </button>
            <p className="safety-disclaimer">{t("tourist.safety.prototypeNote")}</p>

            <form className="incident-form" onSubmit={onSubmitIncidentReport}>
              <div className="field-pair">
                <label>
                  {t("tourist.safety.incidentType")}
                  <select value={incidentType} onChange={(event) => onIncidentTypeChange(event.target.value as IncidentType)}>
                    {incidentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("tourist.safety.locationNote")}
                  <input value={incidentLocationNote} onChange={(event) => onIncidentLocationNoteChange(event.target.value)} placeholder={t("tourist.safety.locationPlaceholder")} />
                </label>
              </div>
              <label>
                {t("tourist.safety.whatHappened")}
                <textarea value={incidentDescription} onChange={(event) => onIncidentDescriptionChange(event.target.value)} placeholder={t("tourist.safety.descriptionPlaceholder")} required />
              </label>
              <button className="secondary-action wide" type="submit">
                <Save size={18} />
                {t("tourist.safety.submitIncident")}
              </button>
            </form>

            <div className="safety-record-list">
              {userSosAlerts.slice(0, 2).map((alert) => (
                <span key={alert.id}>
                  SOS {alert.status} · {formatDateTime(alert.createdAt)}
                </span>
              ))}
              {userIncidentReports.slice(0, 2).map((report) => (
                <span key={report.id}>
                  {getIncidentTypeLabel(report.type, incidentTypeOptions, t)} {report.status} · {formatDateTime(report.createdAt)}
                </span>
              ))}
              {userSosAlerts.length === 0 && userIncidentReports.length === 0 && <small>{t("tourist.safety.noRequests")}</small>}
            </div>
          </details>
        </section>
      </section>
    </Page>
  );
}
