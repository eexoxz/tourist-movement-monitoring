import { useEffect, useRef } from "react";
import { Pencil, Square, X } from "lucide-react";
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
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (kind === "rename" ? input.current : cancel.current)?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [kind]);
  const title = translate(locale, kind === "rename" ? "tourist.trips.renameTrip" : "tourist.home.stopTrip");
  return <div className="modal-overlay trip-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="trip-dialog-title" aria-describedby={kind === "stop" ? "trip-dialog-description" : undefined} onClick={(event) => { if (event.target === event.currentTarget) onCancel(); }} onKeyDown={(event) => {
    if (event.key === "Escape") onCancel();
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")].filter((control) => !control.disabled);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <form className="modal-card trip-action-dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
      <div className="trip-dialog-heading"><span className="trip-dialog-icon" aria-hidden="true">{kind === "rename" ? <Pencil size={22} /> : <Square size={22} />}</span><h2 id="trip-dialog-title">{title}</h2><button className="trip-dialog-close" type="button" aria-label={uiText(locale, "Cancel")} title={uiText(locale, "Cancel")} onClick={onCancel}><X size={20} /></button></div>
      {kind === "rename" ? <label>{travelText(locale, "tripName")}<input ref={input} value={label} onChange={(event) => onLabelChange(event.target.value)} /></label> : <p id="trip-dialog-description">{uiText(locale, "Stop recording this trip?")}</p>}
      <div className="trip-dialog-actions"><button className="secondary-action" ref={cancel} type="button" onClick={onCancel}>{uiText(locale, "Cancel")}</button><button className="primary-action" type="submit">{kind === "rename" ? <Pencil size={18} /> : <Square size={18} />}{kind === "rename" ? uiText(locale, "Save changes") : title}</button></div>
    </form>
  </div>;
}
