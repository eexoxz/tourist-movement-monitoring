import { lazy, Suspense, useState } from "react";
import { LocateFixed, MapPin, Plus } from "lucide-react";
import { allMalaysianStates } from "../data/festivals";
import { destinationCategories } from "../services/destinationManagement";
import { placeText } from "../services/placeSubmissionCopy";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { discoveryText } from "../services/discoveryCopy";
import type { UnlistedPlaceDraft } from "../services/unlistedPlaces";
import type { MalaysianState, MovementPoint } from "../types";
import { unlistedLocationText } from "../services/unlistedLocationCopy";

const CheckInLocationMap = lazy(() => import("./CheckInLocationMap"));

export function UnlistedCheckInForm({ locale, onLocate, onSubmit, initialMode = "gps" }: { locale: Locale; onLocate: () => Promise<{ point?: MovementPoint; error?: string }>; onSubmit: (draft: UnlistedPlaceDraft, point?: MovementPoint) => string | null | Promise<string | null>; initialMode?: "gps" | "manual" }) {
  const [draft, setDraft] = useState<Omit<UnlistedPlaceDraft, "state">>({ name: "", address: "", city: "", category: "food", note: "" });
  const [state, setState] = useState<MalaysianState | "">("");
  const [mode, setMode] = useState(initialMode);
  const [point, setPoint] = useState<MovementPoint>();
  const [busy, setBusy] = useState<"location" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = (key: Parameters<typeof placeText>[1]) => placeText(locale, key);
  const locationText = (key: Parameters<typeof unlistedLocationText>[1]) => unlistedLocationText(locale, key);
  const addressFields = <>
    <div className="field-pair"><label>{uiText(locale, "State")}<select required={mode === "manual"} value={state} onChange={(event) => setState(event.target.value as MalaysianState)}><option value="">{discoveryText(locale, "chooseState")}</option>{allMalaysianStates.map((name) => <option key={name} value={name}>{uiText(locale, name)}</option>)}</select></label><label>{text("area")}<input required={mode === "manual"} minLength={mode === "manual" ? 2 : undefined} maxLength={80} value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label></div>
    <label>{translate(locale, "common.address")}<input required={mode === "manual"} minLength={mode === "manual" ? 8 : undefined} maxLength={300} value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
  </>;
  return <form className="unlisted-check-in-form" onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    if (mode === "manual" && !state) { setError(text("invalid")); return; }
    if (mode === "gps" && !point) { setError(text("location")); return; }
    setBusy("save");
    try { setError(await onSubmit({ ...draft, state: state || undefined }, mode === "gps" ? point : undefined)); }
    catch { setError(locationText("saveFailed")); }
    finally { setBusy(null); }
  }}>
    <div className="check-in-mode-switch" role="group" aria-label={locationText("locationLabel")}><button type="button" disabled={Boolean(busy)} aria-pressed={mode === "gps"} onClick={() => { setMode("gps"); setError(null); }}><MapPin size={18} />{locationText("locationLabel")}</button><button type="button" disabled={Boolean(busy)} aria-pressed={mode === "manual"} onClick={() => { setMode("manual"); setError(null); }}>{translate(locale, "common.address")}</button></div>
    {mode === "gps" && <><button className="secondary-action" type="button" disabled={Boolean(busy)} onClick={async () => {
      setBusy("location"); setError(null); setPoint(undefined);
      try { const result = await onLocate(); setPoint(result.point); setError(result.error ?? null); }
      catch { setError(text("location")); }
      finally { setBusy(null); }
    }}><LocateFixed size={18} />{locationText(busy === "location" ? "locating" : "useGps")}</button>{point && <><strong className="unlisted-location-ready">{locationText("gpsReady")}</strong><Suspense fallback={<p>{translate(locale, "map.loading")}</p>}><CheckInLocationMap points={[point]} label={locationText("locationLabel")} locale={locale} /></Suspense></>}</>}
    <label>{text("name")}<input required minLength={2} maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
    {mode === "manual" ? addressFields : <details className="unlisted-address-details"><summary>{locationText("detailsOptional")}</summary>{addressFields}</details>}
    <label>{translate(locale, "common.category")}<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as UnlistedPlaceDraft["category"] })}>{destinationCategories.map((category) => <option key={category} value={category}>{translate(locale, `category.${category}`)}</option>)}</select></label>
    <label>{text("note")}<textarea maxLength={500} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} /></label>
    {error && <p role="alert" className="status-message">{error}</p>}
    <button className="primary-action" type="submit" disabled={Boolean(busy) || (mode === "gps" && !point)}><Plus size={18} />{busy === "save" ? locationText("saving") : text("submit")}</button>
  </form>;
}
