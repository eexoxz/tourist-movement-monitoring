import { useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { allMalaysianStates } from "../data/festivals";
import { destinationCategories } from "../services/destinationManagement";
import { placeText } from "../services/placeSubmissionCopy";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { discoveryText } from "../services/discoveryCopy";
import type { UnlistedPlaceDraft } from "../services/unlistedPlaces";
import type { MalaysianState } from "../types";

export function UnlistedCheckInForm({ locale, hasGps, onSubmit }: { locale: Locale; hasGps: boolean; onSubmit: (draft: UnlistedPlaceDraft, attachGps: boolean) => string | null }) {
  const [draft, setDraft] = useState<Omit<UnlistedPlaceDraft, "state">>({ name: "", address: "", city: "", category: "food", note: "" });
  const [state, setState] = useState<MalaysianState | "">("");
  const [attachGps, setAttachGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = (key: Parameters<typeof placeText>[1]) => placeText(locale, key);
  return <form className="unlisted-check-in-form" onSubmit={(event) => {
    event.preventDefault();
    if (!state) { setError(text("invalid")); return; }
    setError(onSubmit({ ...draft, state }, attachGps && hasGps));
  }}>
    <label>{text("name")}<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
    <div className="field-pair"><label>{uiText(locale, "State")}<select required value={state} onChange={(event) => setState(event.target.value as MalaysianState)}><option value="">{discoveryText(locale, "chooseState")}</option>{allMalaysianStates.map((name) => <option key={name} value={name}>{uiText(locale, name)}</option>)}</select></label><label>{text("area")}<input required minLength={2} maxLength={80} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label></div>
    <label>{translate(locale, "common.address")}<input required minLength={8} maxLength={300} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
    <label>{translate(locale, "common.category")}<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as UnlistedPlaceDraft["category"] })}>{destinationCategories.map((category) => <option key={category} value={category}>{translate(locale, `category.${category}`)}</option>)}</select></label>
    <label>{text("note")}<textarea maxLength={500} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
    <label className="unlisted-gps-choice"><input type="checkbox" checked={attachGps && hasGps} disabled={!hasGps} onChange={(event) => setAttachGps(event.target.checked)} /><MapPin size={18} aria-hidden="true" />{hasGps ? text("attachGps") : text("noGps")}</label>
    {error && <p role="alert" className="status-message">{error}</p>}
    <button className="primary-action" type="submit"><Plus size={18} />{text("submit")}</button>
  </form>;
}
