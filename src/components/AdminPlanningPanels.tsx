import { Download } from "lucide-react";
import type { Destination, DestinationDemand, MovementAlert, TravelPlan } from "../types";
import { EmptyState } from "./SummaryCards";

export function MovementDemandList({
  title,
  demand,
  destinations,
  compact = false,
}: {
  title: string;
  demand: DestinationDemand[];
  destinations: Destination[];
  compact?: boolean;
}) {
  const visibleDemand = demand.filter((row) => row.popularityScore > 0);

  return (
    <section className={compact ? "movement-demand compact" : "movement-demand"}>
      <h2>{title}</h2>
      {visibleDemand.map((row, index) => {
        const destination = destinations.find((candidate) => candidate.id === row.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="demand-card" key={row.destinationId}>
            <span className="rank-badge">{index + 1}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>
                {row.uniqueTouristCount} tourist profile(s), {row.movementPointCount} nearby points, {row.approachSignalCount} approach signals
              </p>
              <div className="demand-meter">
                <i style={{ width: `${Math.max(8, row.popularityScore)}%` }} />
              </div>
            </div>
            <small>{row.tier}</small>
          </article>
        );
      })}
      {visibleDemand.length === 0 && <EmptyState text="Movement popularity appears after tourists record routes near destinations." />}
    </section>
  );
}

export function MovementAlertList({ alerts, destinations, onExport }: { alerts: MovementAlert[]; destinations: Destination[]; onExport: () => void }) {
  return (
    <section className="movement-alerts">
      <div className="section-heading">
        <h2>Movement Alerts</h2>
        <button className="secondary-action compact-action" onClick={onExport} disabled={alerts.length === 0}>
          <Download size={18} />
          CSV
        </button>
      </div>
      {alerts.map((alert) => {
        const destination = destinations.find((candidate) => candidate.id === alert.destinationId);

        return (
          <article className={`alert-card ${alert.severity}`} key={alert.id}>
            <span>{alert.severity}</span>
            <div>
              <strong>{destination?.name ?? alert.title}</strong>
              <p>{alert.message}</p>
              <small>{alert.recommendedAction}</small>
            </div>
          </article>
        );
      })}
      {alerts.length === 0 && <EmptyState text="Movement alerts appear when tourist flow creates a destination signal." />}
    </section>
  );
}

export function TravelPlanPanel({ plan, destinations }: { plan: TravelPlan; destinations: Destination[] }) {
  return (
    <section className="travel-plan">
      <p>{plan.summary}</p>
      <div className="plan-criteria">
        <span>{plan.criteria.audience === "movement" ? "Movement demand" : `${plan.criteria.audience} profile`}</span>
        <span>{plan.criteria.city === "all" ? "All cities" : plan.criteria.city}</span>
        <span>{plan.criteria.minimumTier}+ demand</span>
        <span>{plan.criteria.maxStops} stop limit</span>
      </div>
      {plan.stops.map((stop) => {
        const destination = destinations.find((candidate) => candidate.id === stop.destinationId);
        if (!destination) {
          return null;
        }

        return (
          <article className="plan-stop" key={stop.destinationId}>
            <span>{stop.order}</span>
            <div>
              <strong>{destination.name}</strong>
              <p>{stop.reason}</p>
            </div>
            <small>{stop.suggestedMinutes} min</small>
          </article>
        );
      })}
    </section>
  );
}
