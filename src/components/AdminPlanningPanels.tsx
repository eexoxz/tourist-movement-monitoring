import { Download, MapPinned, Route } from "lucide-react";
import { useMemo } from "react";
import type { Destination, DestinationDemand, MovementAlert, TravelPlan } from "../types";
import { EmptyState } from "./SummaryCards";
import type { Locale } from "../services/i18n";
import { adminMapText } from "../services/adminNavigationCopy";
import { movementAlertText } from "../services/movementAlertCopy";
import { uiText } from "../services/uiText";
import { demandTierText, planSummary, planningStopReason, profileLabel } from "../services/planningText";

export function MovementDemandList({
  title,
  demand,
  destinations,
  compact = false,
  locale,
  onLocate,
}: {
  onLocate?: (destination: Destination) => void;
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
              <div className="planning-place-heading">
                <strong>{destination.name}</strong>
                {onLocate && <button type="button" className="secondary-action compact-action map-locate-action" onClick={() => onLocate(destination)}><MapPinned size={16} />{adminMapText(locale)}</button>}
              </div>
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

export function MovementAlertList({ alerts, destinations, onExport, locale, onLocate, onViewActivity, hideHeading = false }: {
  hideHeading?: boolean;
  onLocate?: (destination: Destination) => void;
  onViewActivity: (alert: MovementAlert) => void;
  alerts: MovementAlert[];
  destinations: Destination[];
  onExport: () => void;
  locale: Locale;
}) {
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  return (
    <section className="movement-alerts">
      <div className="section-heading">
        {!hideHeading && <h2>{uiText(locale, "Movement Alerts")}</h2>}
        <button className="secondary-action compact-action" onClick={onExport} disabled={alerts.length === 0}>
          <Download size={18} />
          CSV
        </button>
      </div>
      {alerts.map((alert) => {
        const destination = destinationById.get(alert.destinationId);

        return (
          <article className={`alert-card ${alert.severity}`} key={alert.id}>
            <span>{alert.source === "demo" ? movementAlertText(locale, "sample") : uiText(locale, alert.severity)}</span>
            <div>
              <div className="planning-place-heading">
                <strong>{destination?.name ?? alert.title}</strong>
                {destination && onLocate && <button type="button" className="secondary-action compact-action map-locate-action" onClick={() => onLocate(destination)}><MapPinned size={16} />{adminMapText(locale)}</button>}
              </div>
              <p>{movementAlertText(locale, "recent", { count: number.format(alert.recentTouristCount), average: number.format(alert.baselineDailyAverage) })}</p>
              <div className="planning-place-heading">
                <button type="button" className="secondary-action compact-action" onClick={() => onViewActivity(alert)}><Route size={16} />{movementAlertText(locale, "viewActivity")}</button>
              </div>
            </div>
          </article>
        );
      })}
      {alerts.length === 0 && <EmptyState text={movementAlertText(locale, "empty")} />}
    </section>
  );
}

export function TravelPlanPanel({ plan, destinations, locale, onLocate }: { onLocate?: (destination: Destination) => void; plan: TravelPlan; destinations: Destination[]; locale: Locale }) {
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
              <div className="planning-place-heading">
                <strong>{destination.name}</strong>
                {onLocate && <button type="button" className="secondary-action compact-action map-locate-action" onClick={() => onLocate(destination)}><MapPinned size={16} />{adminMapText(locale)}</button>}
              </div>
              <p>{planningStopReason(locale, stop.reason)}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
