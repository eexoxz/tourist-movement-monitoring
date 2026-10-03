import { useState } from "react";
import { discoveryAreas, discoveryStates, getDiscoveryAreasForState } from "../data/discoveryAreas";
import { discoveryText } from "../services/discoveryCopy";
import { translate, type Locale } from "../services/i18n";
import type { MalaysianState, User } from "../types";
import { Settings } from "lucide-react";

export function DiscoveryLocationControl({ user, locale, onChange, onSettings }: {
  user: User;
  locale: Locale;
  onChange: (mode: "current" | "area", areaId?: string) => void;
  onSettings?: () => void;
}) {
  const mode = user.discoveryLocationMode ?? "current";
  const savedArea = discoveryAreas.find((area) => area.id === user.discoveryAreaId);
  const [pendingState, setPendingState] = useState<MalaysianState | "">("");
  const state = savedArea?.state ?? pendingState;
  const areas = getDiscoveryAreasForState(state);
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
        {translate(locale, "tourist.events.state")}
        <select value={state} onChange={(event) => {
          setPendingState(event.target.value as MalaysianState | "");
          onChange("area", "");
        }}>
          <option value="">{discoveryText(locale, "chooseState")}</option>
          {discoveryStates.map((candidate) => <option key={candidate} value={candidate}>{candidate}</option>)}
        </select>
      </label>}
      {mode === "area" && <label>
        {discoveryText(locale, "area")}
        <select disabled={!state} value={savedArea?.id ?? ""} onChange={(event) => onChange("area", event.target.value)}>
          <option value="">{discoveryText(locale, state ? "choose" : "chooseState")}</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
      </label>}
      {onSettings && <button className="secondary-action discovery-settings-button" type="button" onClick={onSettings} title={discoveryText(locale, "settings")} aria-label={discoveryText(locale, "settings")}><Settings size={18} /></button>}
      {mode === "area" && <p>{discoveryText(locale, "privacy")}</p>}
    </section>
  );
}
