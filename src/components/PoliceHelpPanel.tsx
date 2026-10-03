import { lazy, Suspense } from "react";
import { Building2, MapPinned, Navigation } from "lucide-react";
import { getEmergencyMapUrl, getNearbyEmergencyServices, isValidSafetyPoint } from "../services/emergencyServices";
import { emergencyHelpText } from "../services/emergencyHelpCopy";
import { translate, type Locale } from "../services/i18n";
import type { MovementPoint, SosAlert } from "../types";

const EmergencyServiceMap = lazy(() => import("./EmergencyServiceMap"));

export function PoliceHelpPanel({ alert, fallbackPoint, fallbackIsArea = false, locale }: {
  alert: SosAlert;
  fallbackPoint?: Pick<MovementPoint, "latitude" | "longitude">;
  fallbackIsArea?: boolean;
  locale: Locale;
}) {
  const t = (key: Parameters<typeof emergencyHelpText>[1]) => emergencyHelpText(locale, key);
  const attachedPoint = typeof alert.latitude === "number" && typeof alert.longitude === "number"
    ? { latitude: alert.latitude, longitude: alert.longitude } : undefined;
  const hasAttachedPoint = isValidSafetyPoint(attachedPoint);
  const point = hasAttachedPoint ? attachedPoint : fallbackPoint;
  const station = getNearbyEmergencyServices(point).find((service) => service.kind === "police");
  return (
    <section className="police-help" aria-label={t("title")}>
      <h3><Building2 size={20} aria-hidden="true" /> {t("title")}</h3>
      <p role="status">{t("notContacted")}</p>
      <p>{t("purpose")}</p>
      {station ? <>
        <strong className="police-help-name">{station.name}</strong>
        <address>{station.address}</address>
        <small>{t(hasAttachedPoint ? "requestLocation" : fallbackIsArea ? "areaLocation" : "currentLocation")}</small>
        <p>{station.distanceKm} {translate(locale, "tourist.safety.kmAway")}. {t("distance")}</p>
        <Suspense fallback={<p>{translate(locale, "map.loading")}</p>}>
          <EmergencyServiceMap service={station} />
        </Suspense>
        <div className="police-help-actions">
          <a className="secondary-action" href={getEmergencyMapUrl(station)} target="_blank" rel="noopener noreferrer"><MapPinned size={18} />{t("viewMap")}</a>
          <a className="secondary-action" href={getEmergencyMapUrl(station, true)} target="_blank" rel="noopener noreferrer"><Navigation size={18} />{t("directions")}</a>
          {station.sourceUrl && <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">{t("source")}</a>}
        </div>
      </> : <p>{t(isValidSafetyPoint(point) ? "noStation" : "noLocation")}</p>}
    </section>
  );
}
