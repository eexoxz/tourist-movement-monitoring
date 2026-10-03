import { BellRing, CloudRain, Cone, ShieldAlert, TrafficCone, CalendarDays } from "lucide-react";
import { formatDateTime } from "../services/geo";
import type { TourismAdvisory } from "../services/advisories";
import type { TourismAdvisoryType } from "../data/tourismAdvisories";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";

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
      <div className="section-heading">
        <div>
          <span>
            <BellRing size={16} />
            {text("Local tourism advisories")}
          </span>
          <h2>{text("Plan around current alerts")}</h2>
          <p>{text("These locally maintained advisories help tourists adjust routes without adding a live weather or traffic API.")}</p>
        </div>
      </div>
      <div className="advisory-list">
        {advisories.map((advisory) => {
          const Icon = advisoryIcons[advisory.type];

          return (
            <article className={`advisory-card ${advisory.severity}`} key={advisory.id}>
              <div>
                <Icon size={20} />
                <span>{text({ weather: "Weather", traffic: "Traffic", "road-closure": "Road closure", safety: "Safety", event: "Event" }[advisory.type])}</span>
              </div>
              <strong>{text(advisory.title)}</strong>
              <p>{text(advisory.message)}</p>
              <small>{text(advisory.action)}</small>
              <time>{advisory.city} · {text("Until")} {formatDateTime(advisory.endsAt, locale)}</time>
            </article>
          );
        })}
      </div>
    </section>
  );
}
