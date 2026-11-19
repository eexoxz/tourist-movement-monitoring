import { discoveryStates, getDiscoveryState } from "../data/discoveryAreas";
import { discoveryText } from "../services/discoveryCopy";
import { translate, type Locale } from "../services/i18n";
import type { User } from "../types";

export function DiscoveryLocationControl({ user, locale, onChange }: {
  user: User;
  locale: Locale;
  onChange: (mode: "current" | "area", areaId?: string) => void;
}) {
  const mode = user.discoveryLocationMode ?? "current";
  const state = getDiscoveryState(user.discoveryAreaId) ?? "";
  return (
    <section className="discovery-location-control">
      <label>
        {discoveryText(locale, "location")}
        <select aria-label={discoveryText(locale, "location")} value={mode} onChange={(event) => onChange(event.target.value as "current" | "area", user.discoveryAreaId)}>
          <option value="current">{discoveryText(locale, "current")}</option>
          <option value="area">{discoveryText(locale, "area")}</option>
        </select>
      </label>
      {mode === "area" && <label>
        {translate(locale, "tourist.events.state")}
        <select aria-label={translate(locale, "tourist.events.state")} value={state} onChange={(event) => onChange("area", event.target.value ? `state:${event.target.value}` : "")}>
          <option value="">{translate(locale, "tourist.places.allMalaysia")}</option>
          {discoveryStates.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
        </select>
      </label>}
      {mode === "area" && <p>{discoveryText(locale, "privacy")}</p>}
    </section>
  );
}
