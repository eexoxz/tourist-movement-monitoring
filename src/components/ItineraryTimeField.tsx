import { Clock3, X } from "lucide-react";
import type { Locale } from "../services/i18n";
import { itineraryUiText } from "../services/itineraryUiCopy";

const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")).map((hour) => <option key={hour} value={hour}>{hour}</option>);
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minute) => <option key={minute} value={minute}>{minute}</option>);

export function ItineraryTimeField({ label, value = "", locale, invalid, onChange }: {
  label: string; value?: string; locale: Locale; invalid: boolean; onChange: (time: string) => void;
}) {
  const text = (key: Parameters<typeof itineraryUiText>[1]) => itineraryUiText(locale, key);
  return <fieldset className="itinerary-time-field">
    <legend>{label}<small>{text("timeFormat")}</small></legend>
    <div className={`itinerary-time-control${invalid ? " invalid" : ""}`}>
      <Clock3 size={17} aria-hidden="true" />
      <select aria-label={`${label}: ${text("hours")}`} aria-invalid={invalid} value={value.slice(0, 2)} onChange={(event) => onChange(event.target.value ? `${event.target.value}:${value.slice(3) || "00"}` : "")}>
        <option value="">--</option>{hourOptions}
      </select>
      <span aria-hidden="true">:</span>
      <select aria-label={`${label}: ${text("minutes")}`} aria-invalid={invalid} value={value.slice(3)} disabled={!value} onChange={(event) => onChange(`${value.slice(0, 2)}:${event.target.value}`)}>
        {!value && <option value="">--</option>}{minuteOptions}
      </select>
      <button type="button" className="itinerary-time-clear" aria-label={`${text("clear")}: ${label}`} title={text("clear")} disabled={!value} onClick={() => onChange("")}><X size={16} aria-hidden="true" /></button>
    </div>
  </fieldset>;
}
