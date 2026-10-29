import { BellRing, CloudRain, Cone, ShieldAlert, TrafficCone, CalendarDays, ChevronDown } from "lucide-react";
import { formatDateTime } from "../services/geo";
import type { TourismAdvisory } from "../services/advisories";
import type { TourismAdvisoryType } from "../data/tourismAdvisories";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { localizeCity } from "../services/destinationLocale";

type TourismAdvisoryPanelProps = {
  advisories: TourismAdvisory[];
  locale: Locale;
};

const advisoryIcons: Record<TourismAdvisoryType, typeof CloudRain> = {
  weather: CloudRain,
  traffic: TrafficCone,
  "road-closure": Cone,
  safety: ShieldAlert,
  event: CalendarDays,
};

export function TourismAdvisoryPanel({ advisories, locale }: TourismAdvisoryPanelProps) {
  const text = (source: string) => uiText(locale, source);
  if (advisories.length === 0) {
    return null;
  }

  return (
    <section className="tourist-section advisory-panel" aria-label={text("Local tourism advisories")}>
      <header className="advisory-heading"><BellRing size={18} aria-hidden="true" /><h2>{text("Local tourism advisories")}</h2><span>{advisories.length}</span></header>
      <div className="advisory-list">
        {advisories.map((advisory) => {
          const Icon = advisoryIcons[advisory.type];

          return (
            <details className={`advisory-card ${advisory.severity}`} key={advisory.id} open={advisory.severity === "high"}>
              <summary>
                <Icon size={20} aria-hidden="true" />
                <span className="advisory-preview">
                  <strong>{text({ weather: "Weather", traffic: "Traffic", "road-closure": "Road closure", safety: "Safety", event: "Event" }[advisory.type])} · {text(advisory.title)}</strong>
                  <span className="advisory-message">{text(advisory.message)}</span>
                </span>
                <ChevronDown className="advisory-toggle" size={18} aria-hidden="true" />
              </summary>
              <div className="advisory-details">
                <p>{text(advisory.action)}</p>
                <time dateTime={advisory.endsAt}>{localizeCity(advisory.city, locale)} · {text("Until")} {formatDateTime(advisory.endsAt, locale)}</time>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
