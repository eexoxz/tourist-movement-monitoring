import { Download } from "lucide-react";
import { useMemo } from "react";
import type { Destination, DestinationDemand, MovementAlert, TravelPlan } from "../types";
import { EmptyState } from "./SummaryCards";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { demandTierText, planSummary, planningStopReason, profileLabel } from "../services/planningText";

export function MovementDemandList({
  title,
  demand,
  destinations,
  compact = false,
  locale,
}: {
  title: string;
  demand: DestinationDemand[];
  destinations: Destination[];
  compact?: boolean;
  locale: Locale;
}) {
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const visibleDemand = useMemo(() => demand.filter((row) => row.popularityScore > 0), [demand]);

  return (
    <section className={compact ? "movement-demand compact" : "movement-demand"}>
      <h2>{title}</h2>
      {visibleDemand.map((row, index) => {
        const destination = destinationById.get(row.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="demand-card" key={row.destinationId}>
            <span className="rank-badge">{index + 1}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>
                {uiText(locale, "{tourists} tourist profiles, {points} nearby points, {approaches} approach signals", { tourists: row.uniqueTouristCount, points: row.movementPointCount, approaches: row.approachSignalCount })}
              </p>
              <div className="demand-meter">
                <i style={{ width: `${Math.max(8, row.popularityScore)}%` }} />
              </div>
            </div>
            <small>{demandTierText(locale, row.tier)}</small>
          </article>
        );
      })}
      {visibleDemand.length === 0 && <EmptyState text={uiText(locale, "Movement popularity appears after tourists record routes near destinations.")} />}
    </section>
  );
}

export function MovementAlertList({ alerts, destinations, onExport, locale }: { alerts: MovementAlert[]; destinations: Destination[]; onExport: () => void; locale: Locale }) {
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);

  return (
    <section className="movement-alerts">
      <div className="section-heading">
        <h2>{uiText(locale, "Movement Alerts")}</h2>
        <button className="secondary-action compact-action" onClick={onExport} disabled={alerts.length === 0}>
          <Download size={18} />
          CSV
        </button>
      </div>
      {alerts.map((alert) => {
        const destination = destinationById.get(alert.destinationId);

        return (
          <article className={`alert-card ${alert.severity}`} key={alert.id}>
            <span>{uiText(locale, alert.severity)}</span>
            <div>
              <strong>{destination?.name ?? alert.title}</strong>
              <p>{uiText(locale, alert.message)}</p>
              <small>{uiText(locale, alert.recommendedAction)}</small>
            </div>
          </article>
        );
      })}
      {alerts.length === 0 && <EmptyState text={uiText(locale, "Movement alerts appear when tourist flow creates a destination signal.")} />}
    </section>
  );
}

export function TravelPlanPanel({ plan, destinations, locale }: { plan: TravelPlan; destinations: Destination[]; locale: Locale }) {
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);

  return (
    <section className="travel-plan">
      <p>{planSummary(locale, plan)}</p>
      <div className="plan-criteria">
        <span>{plan.criteria.audience === "movement" ? uiText(locale, "Movement demand") : profileLabel(locale, plan.criteria.audience)}</span>
        <span>{plan.criteria.city === "all" ? uiText(locale, "All cities") : plan.criteria.city}</span>
        <span>{uiText(locale, "{tier}+ demand", { tier: demandTierText(locale, plan.criteria.minimumTier) })}</span>
        <span>{uiText(locale, "{count} stop limit", { count: plan.criteria.maxStops })}</span>
      </div>
      {plan.stops.map((stop) => {
        const destination = destinationById.get(stop.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="plan-stop" key={stop.destinationId}>
            <span>{stop.order}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>{planningStopReason(locale, stop.reason)}</p>
            </div>
            <small>{stop.suggestedMinutes} {translate(locale, "common.minutes")}</small>
          </article>
        );
      })}
    </section>
  );
}
