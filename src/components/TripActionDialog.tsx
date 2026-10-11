import { useEffect, useRef } from "react";
import { translate, type Locale } from "../services/i18n";
import { travelText } from "../services/travelExperienceCopy";
import { uiText } from "../services/uiText";

export function TripActionDialog({ kind, label, locale, onLabelChange, onConfirm, onCancel }: {
  kind: "rename" | "stop";
  label: string;
  locale: Locale;
  onLabelChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const cancel = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { (kind === "rename" ? input.current : cancel.current)?.focus(); }, [kind]);
  const title = translate(locale, kind === "rename" ? "tourist.trips.renameTrip" : "tourist.home.stopTrip");
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="trip-dialog-title" onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }} onKeyDown={(event) => {
    if (event.key === "Escape") onCancel();
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")].filter((control) => !control.disabled);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <form className="modal-card trip-action-dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
      <h2 id="trip-dialog-title">{title}</h2>
      {kind === "rename" ? <label>{travelText(locale, "tripName")}<input ref={input} value={label} onChange={(event) => onLabelChange(event.target.value)} /></label> : <p>{uiText(locale, "Stop recording this trip?")}</p>}
      <div className="action-row"><button className="secondary-action" ref={cancel} type="button" onClick={onCancel}>{uiText(locale, "Cancel")}</button><button className="primary-action" type="submit">{kind === "rename" ? uiText(locale, "Save changes") : title}</button></div>
    </form>
  </div>;
}
