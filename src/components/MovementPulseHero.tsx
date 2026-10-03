import type { Destination, DestinationDemand, TravelPlan } from "../types";
import type { Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { planSummary, demandTierText } from "../services/planningText";

type MovementPulseHeroProps = {
  mode: "tourist" | "admin";
  demand: DestinationDemand[];
  destinations: Destination[];
  profile: string;
  pointCount: number;
  plan?: TravelPlan;
  locale: Locale;
};

export function MovementPulseHero({ mode, demand, destinations, profile, pointCount, plan, locale }: MovementPulseHeroProps) {
  const topDemand = demand.find((row) => row.popularityScore > 0);
  const topDestination = topDemand ? destinations.find((destination) => destination.id === topDemand.destinationId) : null;

  return (
    <section className="movement-hero">
      <div className="movement-hero-copy">
        <span>{uiText(locale, mode === "tourist" ? "Live Travel Signal" : "Tourism Planning Signal")}</span>
        <h2>{topDestination ? topDestination.name : uiText(locale, "Movement data is ready to grow")}</h2>
        <p>
          {mode === "tourist"
            ? uiText(locale, "Recommendations combine your travel profile with places other tourists are actually moving toward.")
            : plan ? planSummary(locale, plan) : uiText(locale, "Administrator planning uses tourist movement demand to highlight routes worth promoting.")}
        </p>
      </div>
      <div className="movement-hero-stats">
        <div>
          <small>{uiText(locale, "Current signal")}</small>
          <strong>{topDemand ? `${topDemand.popularityScore}%` : "0%"}</strong>
        </div>
        <div>
          <small>{uiText(locale, mode === "tourist" ? "Your profile" : "Tracked volume")}</small>
          <strong>{mode === "tourist" ? profile : pointCount}</strong>
        </div>
        <div>
          <small>{uiText(locale, "Movement tier")}</small>
          <strong>{demandTierText(locale, topDemand?.tier ?? "pending")}</strong>
        </div>
      </div>
    </section>
  );
}
