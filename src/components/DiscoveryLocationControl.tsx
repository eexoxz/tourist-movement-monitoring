import { discoveryAreas } from "../data/discoveryAreas";
import { discoveryText } from "../services/discoveryCopy";
import type { Locale } from "../services/i18n";
import type { User } from "../types";
import { Settings } from "lucide-react";

export function DiscoveryLocationControl({ user, locale, onChange, onSettings }: {
  user: User;
  locale: Locale;
  onChange: (mode: "current" | "area", areaId?: string) => void;
  onSettings?: () => void;
}) {
  const mode = user.discoveryLocationMode ?? "current";
  return (
    <section className="discovery-location-control">
      <label>
        {discoveryText(locale, "location")}
        <select value={mode} onChange={(event) => onChange(event.target.value as "current" | "area", user.discoveryAreaId)}>
          <option value="current">{discoveryText(locale, "current")}</option>
          <option value="area">{discoveryText(locale, "area")}</option>
        </select>
      </label>
      {mode === "area" && <label>
        {discoveryText(locale, "area")}
        <select value={user.discoveryAreaId ?? ""} onChange={(event) => onChange("area", event.target.value)}>
          <option value="">{discoveryText(locale, "choose")}</option>
          {discoveryAreas.map((area) => <option key={area.id} value={area.id}>{area.name}, {area.state}</option>)}
        </select>
      </label>}
      {onSettings && <button className="secondary-action discovery-settings-button" type="button" onClick={onSettings} title={discoveryText(locale, "settings")} aria-label={discoveryText(locale, "settings")}><Settings size={18} /></button>}
      {mode === "area" && <p>{discoveryText(locale, "privacy")}</p>}
    </section>
  );
}
