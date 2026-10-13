import { ArrowRight, CalendarDays, Compass, LocateFixed, ShieldCheck } from "lucide-react";
import { translate, type Locale } from "../services/i18n";
import { travelText } from "../services/travelExperienceCopy";
import { uiText } from "../services/uiText";
import type { AppView, Destination, FestivalEvent } from "../types";
import { DestinationTeaser } from "./DestinationTeaser";
import { DestinationVisual } from "./DestinationVisual";

export function HomeDiscovery({ featured, destinations, nextFestival, activeTrip, isLocal, needsLocationConsent, locale, onOpenPlace, onViewChange, onAllowLocation, onSafety }: {
  featured?: Destination | null;
  destinations: Destination[];
  nextFestival: FestivalEvent | null;
  activeTrip: boolean;
  isLocal: boolean;
  needsLocationConsent: boolean;
  locale: Locale;
  onOpenPlace: (id: string) => void;
  onViewChange: (view: AppView) => void;
  onAllowLocation: () => void;
  onSafety: () => void;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const text = (key: Parameters<typeof travelText>[1]) => travelText(locale, key);
  const places = destinations.filter((place) => place.id !== featured?.id).slice(0, 3);

  return <div className="home-discovery">
    {featured && <section className="home-billboard">
      <DestinationVisual destination={featured} locale={locale} />
      <div className="home-billboard-copy">
        <div><span>{text("featured")} · {featured.city}</span><h2>{featured.name}</h2></div>
        <button className="secondary-action icon-action" type="button" title={text("explore")} aria-label={`${text("explore")}: ${featured.name}`} onClick={() => onOpenPlace(featured.id)}><ArrowRight size={22} /></button>
      </div>
    </section>}

    <section className="home-journey-invitation">
      <Compass className="home-journey-icon" size={28} aria-hidden="true" />
      <div><h2>{activeTrip ? text("activeTitle") : text("journeyTitle")}</h2><p>{text("journeyDescription")}</p></div>
      <button className="primary-action" type="button" onClick={() => onViewChange("tracking")}>{text(activeTrip ? "continueTrip" : "openTrips")}<ArrowRight size={18} /></button>
    </section>

    <nav className="home-discovery-shortcuts" aria-label={t("tourist.home.nextUp")}>
      <button type="button" onClick={() => onViewChange("recommendations")}><Compass size={22} /><span>{text("places")}</span><ArrowRight size={16} /></button>
      <button type="button" className="home-event-shortcut" onClick={() => onViewChange("events")}><CalendarDays size={22} /><span>{t("nav.events")}</span><ArrowRight size={16} /></button>
      <button type="button" className="home-safety-shortcut" onClick={onSafety}><ShieldCheck size={22} /><span>{t("tourist.safety.eyebrow")}</span><ArrowRight size={16} /></button>
    </nav>

    {!isLocal && <div className="home-location-invitation"><LocateFixed size={20} aria-hidden="true" /><p>{text("noNearby")}</p>{needsLocationConsent && <button className="secondary-action" type="button" onClick={onAllowLocation}>{uiText(locale, "Allow location")}</button>}</div>}

    {places.length > 0 && <section className="home-place-gallery">
      <div className="section-heading"><h2>{text(isLocal ? "nearby" : "places")}</h2><button className="secondary-action compact-action" type="button" onClick={() => onViewChange("recommendations")}>{t("common.viewAll")}<ArrowRight size={16} /></button></div>
      <div className="travel-place-grid">{places.map((place) => <DestinationTeaser key={place.id} destination={place} locale={locale} onOpen={onOpenPlace} />)}</div>
    </section>}

    <section className="home-event-invitation">
      <CalendarDays size={28} aria-hidden="true" />
      <div><span>{t("tourist.home.eventsPreview")}</span><h2>{nextFestival?.name ?? t("nav.events")}</h2>{nextFestival ? <time dateTime={nextFestival.date}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${nextFestival.date}T00:00:00`))}</time> : <p>{t("tourist.home.eventsPreviewText")}</p>}</div>
      <button className="secondary-action" type="button" onClick={() => onViewChange("events")}>{t("common.checkEvents")}<ArrowRight size={18} /></button>
    </section>
  </div>;
}
