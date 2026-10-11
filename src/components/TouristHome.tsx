import { Building2, ChevronDown, Flame, Hospital, PhoneCall, QrCode, Save, ShieldCheck, Square, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { malaysiaEmergencyNumbers } from "../data/emergencyServices";
import { formatDateTime } from "../services/geo";
import { getCheckInDurationMinutes } from "../services/checkIns";
import type { NearbyEmergencyService } from "../services/emergencyServices";
import type { GeoFenceWarning } from "../services/geofencing";
import type { IncidentPhotoAttachment } from "../services/incidentAttachments";
import type { TourismAdvisory } from "../services/advisories";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AppView, AttractionCheckIn, Destination, FestivalEvent, IncidentReport, IncidentType, LocationConsent, MovementPoint, SafetyStatus, SosAlert, SosClosureReason, TripSession, User } from "../types";
import { Page } from "./Page";
import { QrCheckInPanel } from "./QrCheckInPanel";
import { TouristPassCard } from "./TouristPassCard";
import { TourismAdvisoryPanel } from "./TourismAdvisoryPanel";
import { uiText } from "../services/uiText";
import { PoliceHelpPanel } from "./PoliceHelpPanel";
import { emergencyHelpText } from "../services/emergencyHelpCopy";
import { sosText } from "../services/sosCopy";
import { TouristSosRequests } from "./TouristSosRequests";
import { HomeDiscovery } from "./HomeDiscovery";

type IncidentOption = {
  value: IncidentType;
  labelKey: TranslationKey;
};

type TouristHomeProps = {
  displayName: string;
  activeTrip: TripSession | null | undefined;
  currentConsent: LocationConsent | null | undefined;
  destinations: Destination[];
  checkInDestinations?: Destination[];
  discoveryControl?: ReactNode;
  hasLocalReference: boolean;
  geofenceWarnings: GeoFenceWarning[];
  tourismAdvisories: TourismAdvisory[];
  activeCheckIn: AttractionCheckIn | null;
  activeCheckInDestination: Destination | null;
  checkInDestinationId: string;
  showCheckInPanel?: boolean;
  openSafetyPanel?: boolean;
  onSafetyPanelOpened?: () => void;
  recentCheckIns: AttractionCheckIn[];
  recommendedCheckIn: Destination | null;
  openSafetyCount: number;
  user: User;
  incidentType: IncidentType;
  incidentDescription: string;
  incidentLocationNote: string;
  incidentPhoto: IncidentPhotoAttachment | null;
  incidentPhotoMessage: string | null;
  isPreparingIncidentPhoto: boolean;
  incidentTypeOptions: IncidentOption[];
  userSosAlerts: SosAlert[];
  userIncidentReports: IncidentReport[];
  nearbyEmergencyServices: NearbyEmergencyService[];
  safetyReferencePoint?: MovementPoint;
  isSafetyAreaReference?: boolean;
  topRecommendationDestination: Destination | null | undefined;
  nextFestival: FestivalEvent | null;
  locale?: Locale;
  onViewChange: (view: AppView) => void;
  onGrantConsent: () => void;
  onOpenPlace: (id: string) => void;
  onCheckInDestinationChange: (destinationId: string) => void;
  onStartAttractionCheckIn: (destinationId?: string) => void;
  onFinishAttractionCheckIn: () => void;
  onSendSosAlert: () => void;
  onCloseSosAlert: (id: string, reason: SosClosureReason) => void;
  onIncidentTypeChange: (type: IncidentType) => void;
  onIncidentDescriptionChange: (value: string) => void;
  onIncidentLocationNoteChange: (value: string) => void;
  onIncidentPhotoChange: (file: File | null) => void;
  onRemoveIncidentPhoto: () => void;
  onSubmitIncidentReport: (event: FormEvent<HTMLFormElement>) => void;
};

function getIncidentTypeLabel(type: IncidentType, options: IncidentOption[], t: (key: TranslationKey) => string) {
  const option = options.find((candidate) => candidate.value === type);
  return option ? t(option.labelKey) : t("tourist.safety.incidentFallback");
}

function getSafetyStatusLabel(status: SafetyStatus, t: (key: TranslationKey) => string) {
  if (status === "resolved") {
    return t("common.completed");
  }

  if (status === "reviewing") {
    return t("common.waiting");
  }

  return t("common.active");
}

function HomeToolSummary({ icon, label, status }: { icon: ReactNode; label: string; status: string }) {
  return <summary className="home-tool-summary">
    <span className="home-tool-icon" aria-hidden="true">{icon}</span>
    <span className="home-tool-text">
      <span className="home-tool-label">{label}</span>
      <strong>{status}</strong>
    </span>
    <ChevronDown className="home-tool-toggle" size={20} aria-hidden="true" />
  </summary>;
}

export function TouristHome({
  displayName,
  activeTrip,
  currentConsent,
  destinations,
  checkInDestinations = destinations,
  discoveryControl,
  hasLocalReference,
  geofenceWarnings,
  tourismAdvisories,
  activeCheckIn,
  activeCheckInDestination,
  checkInDestinationId,
  showCheckInPanel = false,
  openSafetyPanel = false,
  onSafetyPanelOpened,
  recentCheckIns,
  recommendedCheckIn,
  openSafetyCount,
  user,
  incidentType,
  incidentDescription,
  incidentLocationNote,
  incidentPhoto,
  incidentPhotoMessage,
  isPreparingIncidentPhoto,
  incidentTypeOptions,
  userSosAlerts,
  userIncidentReports,
  nearbyEmergencyServices,
  safetyReferencePoint,
  isSafetyAreaReference = false,
  topRecommendationDestination,
  nextFestival,
  locale = "en",
  onViewChange,
  onGrantConsent,
  onOpenPlace,
  onCheckInDestinationChange,
  onStartAttractionCheckIn,
  onFinishAttractionCheckIn,
  onSendSosAlert,
  onCloseSosAlert,
  onIncidentTypeChange,
  onIncidentDescriptionChange,
  onIncidentLocationNoteChange,
  onIncidentPhotoChange,
  onRemoveIncidentPhoto,
  onSubmitIncidentReport,
}: TouristHomeProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const selectedCheckInDestination = checkInDestinations.find((destination) => destination.id === checkInDestinationId) ?? checkInDestinations[0] ?? null;
  const checkInPanelRef = useRef<HTMLDetailsElement | null>(null);
  const safetyPanelRef = useRef<HTMLDetailsElement | null>(null);
  const [isConfirmingSos, setIsConfirmingSos] = useState(false);
  const checkInTitle = activeCheckInDestination
    ? `${t("tourist.checkin.activeTitlePrefix")} ${activeCheckInDestination.name}`
    : selectedCheckInDestination
      ? `${t("tourist.checkin.checkIn")}: ${selectedCheckInDestination.name}`
      : t("tourist.checkin.emptyTitle");
  const getEmergencyIcon = (kind: NearbyEmergencyService["kind"]) => {
    if (kind === "hospital") {
      return <Hospital size={18} />;
    }

    if (kind === "fire") {
      return <Flame size={18} />;
    }

    return <Building2 size={18} />;
  };

  useEffect(() => {
    if (!showCheckInPanel) {
      return;
    }

    window.setTimeout(() => {
      checkInPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 120);
  }, [showCheckInPanel, checkInDestinationId]);

  useEffect(() => {
    if (!openSafetyPanel || !safetyPanelRef.current) return;
    safetyPanelRef.current.open = true;
    safetyPanelRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
    onSafetyPanelOpened?.();
  }, [openSafetyPanel, onSafetyPanelOpened]);

  return (
    <Page title={displayName ? `${t("tourist.home.welcomeBack")}, ${displayName}` : t("tourist.home.planTitle")} eyebrow={t("common.tourist")}>
      <section className={showCheckInPanel ? "tourist-home-flow qr-check-in-mode" : "tourist-home-flow"}>
        {showCheckInPanel && (
          <section className="home-support-grid qr-check-in-priority">
            <details
              className="tourist-section home-disclosure check-in-panel qr-active-check-in-panel"
              id="tourist-check-in"
              open
              ref={checkInPanelRef}
            >
              <HomeToolSummary icon={<QrCode size={24} />} label={t("tourist.home.visitTools")} status={activeCheckInDestination ? activeCheckInDestination.name : selectedCheckInDestination?.name ?? t("tourist.checkin.emptyTitle")} />
              <div className="section-heading">
                <div>
                  <span>{t("tourist.checkin.eyebrow")}</span>
                  <h2>{checkInTitle}</h2>
                  <p>{activeCheckIn ? t("tourist.checkin.activeDescription") : t("tourist.checkin.emptyDescription")}</p>
                </div>
                {activeCheckIn && <strong>{getCheckInDurationMinutes(activeCheckIn)} {t("common.minutes")}</strong>}
              </div>

              {!activeCheckIn && (
                <div className="check-in-stack">
                  <TouristPassCard user={user} destination={selectedCheckInDestination} locale={locale} compact />
                  <QrCheckInPanel
                    destinations={checkInDestinations}
                    selectedDestination={selectedCheckInDestination}
                    locale={locale}
                    onDestinationChange={onCheckInDestinationChange}
                    onConfirm={onStartAttractionCheckIn}
                  />
                </div>
              )}

              {activeCheckIn && (
                <div className="qr-check-in-confirmation">
                  <div className="qr-visit-card">
                    <span>{t("tourist.checkin.currentlyCheckedIn")}</span>
                    <strong>{activeCheckInDestination?.name ?? selectedCheckInDestination?.name ?? t("tourist.checkin.unknownAttraction")}</strong>
                    <p>{t("tourist.checkin.activeDescription")}</p>
                    <div className="qr-visit-meta">
                      <span>
                        <strong>{getCheckInDurationMinutes(activeCheckIn)}</strong>
                        <small>{t("tourist.checkin.minVisit")}</small>
                      </span>
                      {activeCheckInDestination && (
                        <span>
                          <strong>{activeCheckInDestination.city}</strong>
                          <small>{t("tourist.checkin.attraction")}</small>
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="secondary-action wide" type="button" onClick={onFinishAttractionCheckIn}>
                    <Square size={18} />
                    {t("tourist.checkin.checkOut")}
                  </button>
                </div>
              )}
            </details>
          </section>
        )}

        {!showCheckInPanel && discoveryControl}
        {!showCheckInPanel && <HomeDiscovery featured={topRecommendationDestination} destinations={destinations} nextFestival={nextFestival} activeTrip={Boolean(activeTrip)} isLocal={hasLocalReference} needsLocationConsent={!currentConsent} locale={locale} onOpenPlace={onOpenPlace} onViewChange={onViewChange} onAllowLocation={onGrantConsent} onSafety={() => {
          if (safetyPanelRef.current) {
            safetyPanelRef.current.open = true;
            safetyPanelRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
          }
        }} />}


        {!showCheckInPanel && geofenceWarnings.length > 0 && (
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
                    <strong>{uiText(locale, warning.geofence.name)}</strong>
                    <span>{uiText(locale, "{count} m away", { count: warning.distanceMeters })}</span>
                  </div>
                  <p>{uiText(locale, warning.geofence.message)}</p>
                  <small>{uiText(locale, warning.geofence.recommendedAction)}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {!showCheckInPanel && <TourismAdvisoryPanel advisories={tourismAdvisories} locale={locale} />}



        <section className={showCheckInPanel ? "home-support-grid qr-secondary-support" : "home-support-grid"}>
          {!showCheckInPanel && (
            <details className="tourist-section home-disclosure check-in-panel" id="tourist-check-in" open={Boolean(activeCheckIn)} ref={checkInPanelRef}>
              <HomeToolSummary icon={<QrCode size={24} />} label={t("tourist.home.visitTools")} status={activeCheckInDestination ? activeCheckInDestination.name : t("tourist.checkin.emptyTitle")} />
              <div className="section-heading">
                <div>
                  <span>{t("tourist.checkin.eyebrow")}</span>
                  <h2>{activeCheckInDestination ? `${t("tourist.checkin.activeTitlePrefix")} ${activeCheckInDestination.name}` : t("tourist.checkin.emptyTitle")}</h2>
                  <p>{activeCheckIn ? t("tourist.checkin.activeDescription") : t("tourist.checkin.emptyDescription")}</p>
                </div>
                {activeCheckIn && <strong>{getCheckInDurationMinutes(activeCheckIn)} {t("common.minutes")}</strong>}
              </div>

              {!activeCheckIn && (
                <div className="check-in-stack">
                  <TouristPassCard user={user} destination={selectedCheckInDestination} locale={locale} compact />
                  <QrCheckInPanel
                    destinations={checkInDestinations}
                    selectedDestination={selectedCheckInDestination}
                    locale={locale}
                    onDestinationChange={onCheckInDestinationChange}
                    onConfirm={onStartAttractionCheckIn}
                  />
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
                  const destination = checkInDestinations.find((candidate) => candidate.id === checkIn.destinationId);

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
          )}

          <details className="tourist-section home-disclosure safety-panel" id="tourist-safety" ref={safetyPanelRef} open={openSafetyCount > 0}>
            <HomeToolSummary icon={<ShieldCheck size={24} />} label={t("tourist.safety.eyebrow")} status={`${openSafetyCount} ${t("tourist.safety.open")}`} />
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

            <button className="primary-action danger wide" type="button" onClick={() => setIsConfirmingSos(true)} disabled={isConfirmingSos || userSosAlerts.some((alert) => alert.status !== "resolved")}>
              <ShieldCheck size={18} />
              {t("tourist.safety.sos")}
            </button>
            {isConfirmingSos && <div className="sos-confirmation" role="group" aria-label={emergencyHelpText(locale, "confirm")}>
              <p>{emergencyHelpText(locale, "confirm")}</p>
              <div className="police-help-actions">
                <button className="primary-action danger" type="button" onClick={() => { setIsConfirmingSos(false); onSendSosAlert(); }}>{emergencyHelpText(locale, "confirmAction")}</button>
                <button className="secondary-action" type="button" onClick={() => setIsConfirmingSos(false)}>{emergencyHelpText(locale, "cancel")}</button>
              </div>
            </div>}
            {userSosAlerts.some((alert) => alert.status !== "resolved") && <p className="safety-disclaimer">{sosText(locale, "activeExists")}</p>}
            <p className="safety-disclaimer">{t("tourist.safety.prototypeNote")}</p>
            <TouristSosRequests alerts={userSosAlerts} locale={locale} onClose={onCloseSosAlert} />
            {userSosAlerts.find((alert) => alert.status !== "resolved") && <PoliceHelpPanel
              alert={userSosAlerts.find((alert) => alert.status !== "resolved")!} fallbackPoint={safetyReferencePoint} fallbackIsArea={isSafetyAreaReference} locale={locale}
            />}

            <section className="emergency-help-panel">
              <div className="emergency-help-heading">
                <div>
                  <span>{t("tourist.safety.emergencyHelp")}</span>
                  <strong>{t("tourist.safety.callFirstThenReport")}</strong>
                </div>
                <PhoneCall size={20} />
              </div>
              <div className="emergency-number-grid">
                {malaysiaEmergencyNumbers.map((number) => (
                  <a className="emergency-number-card" key={number.phone} href={`tel:${number.phone}`} aria-label={`${t("tourist.safety.call")} ${t(number.labelKey)} ${number.phone}`}>
                    <span>{t(number.labelKey)}</span>
                    <strong>{number.phone}</strong>
                    <small>{t(number.descriptionKey)}</small>
                  </a>
                ))}
              </div>
              <div className="nearby-service-list">
                <div className="nearby-service-heading">
                  <strong>{t("tourist.safety.nearestPreparedServices")}</strong>
                  <span>{nearbyEmergencyServices.length ? t("tourist.safety.basedOnLatestLocation") : t("tourist.safety.allowLocationToSort")}</span>
                </div>
                {nearbyEmergencyServices.map((service) => (
                  <article className={`nearby-service-card ${service.kind}`} key={service.id}>
                    <span className="nearby-service-icon">{getEmergencyIcon(service.kind)}</span>
                    <div>
                      <strong>{service.name}</strong>
                      <span>{service.address}</span>
                      <small>{service.distanceKm} {t("tourist.safety.kmAway")} · {uiText(locale, { police: "Police contact in the prepared directory.", hospital: "Hospital in the prepared directory.", fire: "Fire and rescue contact in the prepared directory." }[service.kind])}</small>
                    </div>
                    <a className="secondary-action compact-action" href={`tel:${service.phone}`}>
                      {t("tourist.safety.call")} {service.phone}
                    </a>
                  </article>
                ))}
                {nearbyEmergencyServices.length === 0 && <small className="safety-disclaimer">{t("tourist.safety.noSavedLocationForServices")}</small>}
              </div>
            </section>

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
              <label className="incident-photo-field">
                {t("tourist.safety.photoEvidence")}
                <input type="file" accept="image/*" onChange={(event) => onIncidentPhotoChange(event.target.files?.[0] ?? null)} />
              </label>
              {incidentPhoto && (
                <figure className="incident-photo-preview">
                  <img src={incidentPhoto.photoDataUrl} alt={incidentPhoto.photoName} />
                  <figcaption>
                    <span>{incidentPhoto.photoName}</span>
                    <button className="secondary-action compact-action" type="button" onClick={onRemoveIncidentPhoto}>
                      {t("tourist.safety.removePhoto")}
                    </button>
                  </figcaption>
                </figure>
              )}
              {incidentPhotoMessage && <p className="status-message">{incidentPhotoMessage}</p>}
              <button className="secondary-action wide" type="submit" disabled={isPreparingIncidentPhoto}>
                <Save size={18} />
                {isPreparingIncidentPhoto ? t("tourist.safety.preparingPhoto") : t("tourist.safety.submitIncident")}
              </button>
            </form>

            <div className="safety-record-list">
              {userIncidentReports.slice(0, 2).map((report) => (
                <article className="safety-record-item" key={report.id}>
                  <strong>{getIncidentTypeLabel(report.type, incidentTypeOptions, t)} · {getSafetyStatusLabel(report.status, t)}</strong>
                  <span>{report.adminNote || `${t("common.waiting")} · ${formatDateTime(report.createdAt, locale)}`}</span>
                </article>
              ))}
              {userSosAlerts.length === 0 && userIncidentReports.length === 0 && <small>{t("tourist.safety.noRequests")}</small>}
            </div>
          </details>
        </section>
      </section>
    </Page>
  );
}
