import { CalendarDays, MapPinned, Settings, ThumbsDown, X } from "lucide-react";
import { createPortal } from "react-dom";
import { discoveryText } from "../services/discoveryCopy";
import type { Locale } from "../services/i18n";
import type { LiveNearbySuggestion } from "../services/liveSuggestions";
import type { FestivalEvent } from "../types";

export function DiscoveryPrompt({ suggestion, event, locale, onClose, onView, onHide, onSettings }: {
  suggestion: LiveNearbySuggestion | null;
  event: FestivalEvent | null;
  locale: Locale;
  onClose: () => void;
  onView: () => void;
  onHide: () => void;
  onSettings: () => void;
}) {
  if (!suggestion && !event) return null;
  const heading = suggestion ? suggestion.reason === "popular" ? "popular" : suggestion.reason === "preference" ? "preference" : "nearby" : "event";
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const date = event ? dateFormatter.format(new Date(`${event.date}T00:00:00`)) + (event.endDate && event.endDate !== event.date ? ` - ${dateFormatter.format(new Date(`${event.endDate}T00:00:00`))}` : "") : "";
  return createPortal(
    <aside className="discovery-prompt" aria-live="polite" aria-label={discoveryText(locale, heading)}>
      <button className="discovery-prompt-close" type="button" onClick={onClose} title={discoveryText(locale, "dismiss")} aria-label={discoveryText(locale, "dismiss")}><X size={18} /></button>
      <span>{discoveryText(locale, heading)}</span>
      <h2>{suggestion?.destination.name ?? event?.name}</h2>
      <p>{suggestion ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(suggestion.distanceKm)} ${discoveryText(locale, "distance")}` : date}</p>
      <div className="discovery-prompt-actions">
        <button className="primary-action compact-action" type="button" onClick={onView}>
          {suggestion ? <MapPinned size={17} /> : <CalendarDays size={17} />}{discoveryText(locale, suggestion ? "view" : "viewEvent")}
        </button>
        <button className="secondary-action compact-action" type="button" onClick={onSettings} title={discoveryText(locale, "settings")} aria-label={discoveryText(locale, "settings")}><Settings size={17} /></button>
      </div>
      {suggestion && <button className="discovery-hide-button" type="button" onClick={onHide}><ThumbsDown size={15} />{discoveryText(locale, "hide")}</button>}
    </aside>, document.body
  );
}
