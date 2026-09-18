import { BellRing, CloudRain, Cone, ShieldAlert, TrafficCone, CalendarDays } from "lucide-react";
import { formatDateTime } from "../services/geo";
import type { TourismAdvisory } from "../services/advisories";
import type { TourismAdvisoryType } from "../data/tourismAdvisories";

type TourismAdvisoryPanelProps = {
  advisories: TourismAdvisory[];
};

const advisoryIcons: Record<TourismAdvisoryType, typeof CloudRain> = {
  weather: CloudRain,
  traffic: TrafficCone,
  "road-closure": Cone,
  safety: ShieldAlert,
  event: CalendarDays,
};

export function TourismAdvisoryPanel({ advisories }: TourismAdvisoryPanelProps) {
  if (advisories.length === 0) {
    return null;
  }

  return (
    <section className="tourist-section advisory-panel" aria-label="Local tourism advisories">
      <div className="section-heading">
        <div>
          <span>
            <BellRing size={16} />
            Local tourism advisories
          </span>
          <h2>Plan around current alerts</h2>
          <p>These locally maintained advisories help tourists adjust routes without adding a live weather or traffic API.</p>
        </div>
      </div>
      <div className="advisory-list">
        {advisories.map((advisory) => {
          const Icon = advisoryIcons[advisory.type];

          return (
            <article className={`advisory-card ${advisory.severity}`} key={advisory.id}>
              <div>
                <Icon size={20} />
                <span>{advisory.type.replace("-", " ")}</span>
              </div>
              <strong>{advisory.title}</strong>
              <p>{advisory.message}</p>
              <small>{advisory.action}</small>
              <time>{advisory.city} · Until {formatDateTime(advisory.endsAt)}</time>
            </article>
          );
        })}
      </div>
    </section>
  );
}
