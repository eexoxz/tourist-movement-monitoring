import { CalendarDays, Clock3, Coins, MapPin, Navigation, QrCode, Sparkles, ThumbsDown, Users } from "lucide-react";
import type { Destination } from "../types";
import { translate, type Locale } from "../services/i18n";
import { discoveryText } from "../services/discoveryCopy";
import { emergencyHelpText } from "../services/emergencyHelpCopy";
import { interfaceText } from "../services/interfaceCopy";
import { DestinationVisual } from "./DestinationVisual";

export function PlaceGuide({ destination, locale, distance, distanceLabel, demand, preference, eventRelevance, onCheckIn, onOpenEvents, onHide }: {
  destination: Destination; locale: Locale; distance: string; distanceLabel: string; demand: string; preference: string; eventRelevance: string;
  onCheckIn?: () => void; onOpenEvents: () => void; onHide?: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const directions = `https://www.openstreetmap.org/directions?to=${encodeURIComponent(`${destination.latitude},${destination.longitude}`)}#map=16/${destination.latitude}/${destination.longitude}`;
  return <div className="place-guide">
    <DestinationVisual destination={destination} locale={locale} />
    <div className="place-guide-body">
      <header><span className="place-guide-category">{t(`category.${destination.category}`)}</span><h2>{destination.name}</h2><p className="place-guide-address"><MapPin size={17} aria-hidden="true" />{destination.address ?? `${destination.city}, Malaysia`}</p></header>
      <p className="place-guide-description">{destination.description}</p>
      <div className="place-guide-actions">
        {onCheckIn && <button className="primary-action" type="button" onClick={onCheckIn}><QrCode size={18} />{t("tourist.checkin.checkIn")}</button>}
        <a className="secondary-action" href={directions} target="_blank" rel="noopener noreferrer"><Navigation size={18} />{emergencyHelpText(locale, "directions")}</a>
      </div>
      <section className="place-guide-section"><h3>{interfaceText(locale, "guide")}</h3><dl className="place-guide-facts">
        <div><dt><Navigation size={16} />{distanceLabel}</dt><dd>{distance}</dd></div>
        <div><dt><Clock3 size={16} />{t("common.averageVisit")}</dt><dd>{destination.averageVisitMinutes} {t("common.minutes")}</dd></div>
        <div className="wide"><dt><Clock3 size={16} />{t("common.openingHours")}</dt><dd>{destination.openingHours ?? t("common.checkLocally")}</dd></div>
        <div className="wide"><dt><Coins size={16} />{t("common.feeNote")}</dt><dd>{destination.feeNote ?? t("common.feeMayVary")}</dd></div>
      </dl></section>
      {Boolean(destination.visitTips?.length) && <section className="place-guide-section"><h3>{t("tourist.places.beforeYouGo")}</h3><ul className="place-guide-tips">{destination.visitTips!.map((tip) => <li key={tip}>{tip}</li>)}</ul></section>}
      <details className="place-guide-context"><summary>{interfaceText(locale, "more")}</summary><dl className="place-guide-facts">
        <div className="wide"><dt><Users size={16} />{t("common.demand")}</dt><dd>{demand}</dd></div>
        <div className="wide"><dt><Sparkles size={16} />{t("tourist.places.tripFit")}</dt><dd>{preference}</dd></div>
        <div className="wide"><dt><CalendarDays size={16} />{t("tourist.places.eventRelevance")}</dt><dd>{eventRelevance}</dd></div>
      </dl><div className="place-guide-secondary"><button className="secondary-action" type="button" onClick={onOpenEvents}><CalendarDays size={18} />{t("common.checkEvents")}</button>{onHide && <button className="secondary-action" type="button" onClick={onHide}><ThumbsDown size={18} />{discoveryText(locale, "hide")}</button>}</div></details>
    </div>
  </div>;
}
