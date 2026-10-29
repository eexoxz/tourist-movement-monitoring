import { ArrowRight, CalendarDays, Compass, LocateFixed, ShieldCheck } from "lucide-react";
import { translate, type Locale } from "../services/i18n";
import { travelText } from "../services/travelExperienceCopy";
import { uiText } from "../services/uiText";
import type { AppView, Destination, FestivalEvent } from "../types";
import { HomeSpotlight } from "./HomeSpotlight";
import type { ReactNode } from "react";
import type { HomeSpotlightContext } from "../services/homeSpotlights";

export function HomeDiscovery({ destinations, spotlightDestinations = destinations, spotlightEvents, spotlightContext, activeTrip, trackingStatus, isLocal, needsLocationConsent, locale, onOpenPlace, onViewChange, onOpenSpotlightEvent, onAllowLocation, onSafety }: {
  destinations: Destination[];
  spotlightDestinations?: Destination[];
  spotlightEvents?: FestivalEvent[];
  spotlightContext?: HomeSpotlightContext;
  activeTrip: boolean;
  trackingStatus?: ReactNode;
  isLocal: boolean;
  needsLocationConsent: boolean;
  locale: Locale;
  onOpenPlace: (id: string) => void;
  onViewChange: (view: AppView) => void;
  onOpenSpotlightEvent?: (id: string) => void;
  onAllowLocation: () => void;
  onSafety: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const text = (key: Parameters<typeof travelText>[1]) => travelText(locale, key);
  const journeyInvitation = <section className="home-journey-invitation">
      <Compass className="home-journey-icon" size={28} aria-hidden="true" />
      <div>{activeTrip && <span className="home-active-trip">{t("common.active")}</span>}<h2>{activeTrip ? text("activeTitle") : text("journeyTitle")}</h2><p>{text("journeyDescription")}</p></div>
      <button className="primary-action" type="button" onClick={() => onViewChange("tracking")}>{text(activeTrip ? "continueTrip" : "openTrips")}<ArrowRight size={18} /></button>
    </section>;
  return <div className="home-discovery">
    {activeTrip && <div className="home-active-journey">{journeyInvitation}{trackingStatus}</div>}
    <HomeSpotlight destinations={spotlightDestinations} events={spotlightEvents} context={spotlightContext} locale={locale} onOpenPlace={onOpenPlace} onOpenEvents={onOpenSpotlightEvent ?? (() => onViewChange("events"))} />
    {!activeTrip && journeyInvitation}

    <nav className="home-discovery-shortcuts" aria-label={t("tourist.home.nextUp")}>
      <button type="button" onClick={() => onViewChange("recommendations")}><span className="home-shortcut-symbol"><Compass size={24} /></span><span>{text("places")}</span><ArrowRight size={16} /></button>
      <button type="button" className="home-event-shortcut" onClick={() => onViewChange("events")}><span className="home-shortcut-symbol"><CalendarDays size={24} /></span><span>{t("nav.events")}</span><ArrowRight size={16} /></button>
      <button type="button" className="home-safety-shortcut" onClick={onSafety}><span className="home-shortcut-symbol"><ShieldCheck size={24} /></span><span>{t("tourist.safety.eyebrow")}</span><ArrowRight size={16} /></button>
    </nav>

    {!isLocal && <div className="home-location-invitation"><LocateFixed size={20} aria-hidden="true" /><p>{text("noNearby")}</p>{needsLocationConsent && <button className="secondary-action" type="button" onClick={onAllowLocation}>{uiText(locale, "Allow location")}</button>}</div>}

  </div>;
}
