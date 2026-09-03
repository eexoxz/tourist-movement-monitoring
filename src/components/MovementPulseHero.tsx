import type { Destination, DestinationDemand, TravelPlan } from "../types";

type MovementPulseHeroProps = {
  mode: "tourist" | "admin";
  demand: DestinationDemand[];
  destinations: Destination[];
  profile: string;
  pointCount: number;
  plan?: TravelPlan;
};

export function MovementPulseHero({ mode, demand, destinations, profile, pointCount, plan }: MovementPulseHeroProps) {
  const topDemand = demand.find((row) => row.popularityScore > 0);
  const topDestination = topDemand ? destinations.find((destination) => destination.id === topDemand.destinationId) : null;

  return (
    <section className="movement-hero">
      <div className="movement-hero-copy">
        <span>{mode === "tourist" ? "Live Travel Signal" : "Tourism Planning Signal"}</span>
        <h2>{topDestination ? topDestination.name : "Movement data is ready to grow"}</h2>
        <p>
          {mode === "tourist"
            ? "Recommendations combine your travel profile with places other tourists are actually moving toward."
            : plan?.summary ?? "Administrator planning uses tourist movement demand to highlight routes worth promoting."}
        </p>
      </div>
      <div className="movement-hero-stats">
        <div>
          <small>Current signal</small>
          <strong>{topDemand ? `${topDemand.popularityScore}%` : "0%"}</strong>
        </div>
        <div>
          <small>{mode === "tourist" ? "Your profile" : "Tracked volume"}</small>
          <strong>{mode === "tourist" ? profile : pointCount}</strong>
        </div>
        <div>
          <small>Movement tier</small>
          <strong>{topDemand?.tier ?? "pending"}</strong>
        </div>
      </div>
    </section>
  );
}
