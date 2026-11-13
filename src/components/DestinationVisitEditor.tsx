import { useId } from "react";
import { Plus, X } from "lucide-react";
import type { Destination } from "../types";
import { translate, type Locale } from "../services/i18n";
import { maxVisitRows } from "../services/visitDetails";
import { visitorDays, visitorHoursLabel, visitorPriceLabel, visitorValue } from "../services/visitorInformation";
import { visitorText } from "../services/visitorInformationCopy";

type VisitDetails = NonNullable<Destination["visitDetails"]>;

export function DestinationVisitEditor({ value, locale, invalid, onChange }: {
  value: VisitDetails;
  locale: Locale;
  invalid: boolean;
  onChange: (value: VisitDetails) => void;
}) {
  const groupOptionsId = useId();
  const t = (key: Parameters<typeof visitorText>[1]) => visitorText(locale, key);
  const hours = value.hours ?? [];
  const prices = value.prices ?? [];
  const groups = new Map(prices.flatMap(({ residency }) => residency ? [[visitorValue(residency, locale), residency] as const] : []));
  const hoursNotes = value.hoursNotes ?? [];
  const priceNotes = value.priceNotes ?? [];
  const replace = <Row,>(rows: Row[], index: number, next: Row) => rows.map((row, at) => at === index ? next : row);
  const remove = <Row,>(rows: Row[], index: number) => rows.filter((_, at) => at !== index);
  const toText = (text: string) => text ? { text } : undefined;
  const noteLines = (notes: typeof hoursNotes) => notes.map((note) => visitorValue(note, locale)).join("\n");
  const readNotes = (input: string, current: typeof hoursNotes) => input.split("\n").map((text) => current.find((note) => visitorValue(note, locale) === text) ?? { text });

  return <section className="destination-visit-editor" aria-label={t("visitDetails")}>
    <details className="destination-visit-section">
      <summary>{translate(locale, "common.openingHours")} <span>{hours.length || ""}</span></summary>
      <div className="destination-visit-fields">
        {hours.map((row, index) => <div className="destination-visit-row" key={index}>
          <div className="field-pair">
            <label>{t("rowLabel")}
              <input maxLength={120} value={visitorHoursLabel(row, locale)}
                onChange={(event) => onChange({ ...value, hours: replace(hours, index, { label: toText(event.target.value), time: row.time }) })} />
            </label>
            <label>{t("hours")}
              <input maxLength={80} value={row.time} placeholder="09:00 – 17:00"
                onChange={(event) => onChange({ ...value, hours: replace(hours, index, { ...row, time: event.target.value }) })} />
            </label>
          </div>
          <button className="secondary-action icon-action" type="button" aria-label={`${t("removeHour")} ${index + 1}`}
            onClick={() => onChange({ ...value, hours: remove(hours, index) })}><X size={16} aria-hidden="true" /></button>
        </div>)}
        <button className="secondary-action compact-action" type="button" disabled={hours.length >= maxVisitRows}
          onClick={() => onChange({ ...value, hours: [...hours, { time: "" }] })}><Plus size={16} aria-hidden="true" />{t("addHour")}</button>
        <label>{t("notes")}
          <textarea rows={2} maxLength={1500} value={noteLines(hoursNotes)}
            onChange={(event) => onChange({ ...value, hoursNotes: readNotes(event.target.value, hoursNotes) })} />
        </label>
        <fieldset className="destination-visit-days">
          <legend>{t("closed")}</legend>
          {Array.from({ length: 7 }, (_, index) => (index + 1) % 7).map((day) => <label key={day}>
            <input type="checkbox" checked={Boolean(value.closedDays?.includes(day))} onChange={(event) => {
              const days = value.closedDays ?? [];
              onChange({ ...value, closedDays: event.target.checked ? [...days, day].sort((a, b) => a - b) : days.filter((closedDay) => closedDay !== day) });
            }} />
            {visitorDays([day], locale)}
          </label>)}
        </fieldset>
      </div>
    </details>
    <details className="destination-visit-section">
      <summary>{t("fees")} <span>{prices.length || ""}</span></summary>
      <div className="destination-visit-fields">
        <datalist id={groupOptionsId}>{[...groups.keys()].map((group) => <option key={group} value={group} />)}</datalist>
        <label>{t("ticketType")}
          <input maxLength={120} value={value.priceScope ? visitorValue(value.priceScope, locale) : ""}
            onChange={(event) => onChange({ ...value, priceScope: toText(event.target.value) })} />
        </label>
        {prices.map((row, index) => <div className="destination-visit-row" key={index}>
          <div className="destination-visit-price">
            <label>{t("rowLabel")}
              <input maxLength={120} value={visitorPriceLabel({ ...row, residency: undefined }, locale)}
                onChange={(event) => onChange({ ...value, prices: replace(prices, index, { ...row, audience: { text: event.target.value }, ages: undefined, height: undefined }) })} />
            </label>
            <label>{t("group")}
              <input list={groupOptionsId} maxLength={120} value={row.residency ? visitorValue(row.residency, locale) : ""}
                onChange={(event) => onChange({ ...value, prices: replace(prices, index, { ...row, residency: groups.get(event.target.value.trim()) ?? toText(event.target.value) }) })} />
            </label>
            <label>{t("amount")}
              <input type="number" inputMode="decimal" step="any" value={Number.isFinite(row.amount) ? row.amount : ""}
                onChange={(event) => onChange({ ...value, prices: replace(prices, index, { ...row, amount: event.target.valueAsNumber }) })} />
            </label>
          </div>
          <button className="secondary-action icon-action" type="button" aria-label={`${t("removePrice")} ${index + 1}`}
            onClick={() => onChange({ ...value, prices: remove(prices, index) })}><X size={16} aria-hidden="true" /></button>
        </div>)}
        <button className="secondary-action compact-action" type="button" disabled={prices.length >= maxVisitRows}
          onClick={() => onChange({ ...value, prices: [...prices, { audience: { text: "" }, amount: NaN }] })}><Plus size={16} aria-hidden="true" />{t("addPrice")}</button>
        <label>{t("notes")}
          <textarea rows={2} maxLength={1500} value={noteLines(priceNotes)}
            onChange={(event) => onChange({ ...value, priceNotes: readNotes(event.target.value, priceNotes) })} />
        </label>
      </div>
    </details>
    <details className="destination-visit-section">
      <summary>{t("sourcesAndClosure")}</summary>
      <div className="destination-visit-fields">
        <label>{t("sourceLinks")}
          <textarea rows={2} maxLength={3005} value={value.sources.join("\n")}
            onChange={(event) => onChange({ ...value, sources: event.target.value.split("\n") })} />
        </label>
        <label>{t("checked")}
          <input type="date" value={value.checkedAt ?? ""} onChange={(event) => onChange({ ...value, checkedAt: event.target.value })} />
        </label>
        <label className="destination-closure-toggle">
          <input type="checkbox" checked={Boolean(value.closure)} onChange={(event) => onChange({ ...value, closure: event.target.checked ? { from: "", through: "" } : undefined })} />
          {t("temporarilyClosed")}
        </label>
        {value.closure && <div className="field-pair">
          <label>{t("closureFrom")}
            <input type="date" value={value.closure.from} onChange={(event) => onChange({ ...value, closure: { ...value.closure!, from: event.target.value } })} />
          </label>
          <label>{t("closureThrough")}
            <input type="date" value={value.closure.through} onChange={(event) => onChange({ ...value, closure: { ...value.closure!, through: event.target.value } })} />
          </label>
        </div>}
      </div>
    </details>
    {invalid && <p className="status-message" role="alert">{t("invalidVisitDetails")}</p>}
  </section>;
}
