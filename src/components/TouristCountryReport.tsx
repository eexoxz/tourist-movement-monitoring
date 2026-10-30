import { ChartNoAxesCombined, Check, ChevronDown, Download, ListFilter, Printer, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import type { Locale } from "../services/i18n";
import type { User } from "../types";
import type { TouristManagementRow } from "../services/touristManagement";
import { downloadTouristCsv, getCountryCounts, printTouristReport } from "../services/touristReports";
import { reviewText } from "../services/reviewUpdateCopy";
import { isSampleTourist } from "../data/demoData";
import { demoDatasetText } from "../services/demoDatasetCopy";
import { directoryText } from "../services/touristDirectoryCopy";
import { translateAdmin } from "../services/adminI18n";

export function TouristCountryReport({ users, rows, locale, country, onCountryChange, compact = false }: {
  users: User[]; rows: TouristManagementRow[]; locale: Locale; country: string; onCountryChange: (country: string) => void; compact?: boolean;
}) {
  const [fullIdentity, setFullIdentity] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countries = getCountryCounts(users);
  const text = (key: Parameters<typeof reviewText>[1]) => reviewText(locale, key);
  const chartId = useId();
  const selectedCountry = countries.find((row) => row.key === country);
  const visibleCountries = expanded ? countries : countries.filter((row, index) => index < 6 || row.key === country);
  const largestCount = Math.max(1, ...countries.map((row) => row.count));
  const number = new Intl.NumberFormat(locale);
  const countryList = <div className="country-breakdown-content">
    {users.some(isSampleTourist) && <p className="report-export-note">{demoDatasetText(locale, "dataNote")}</p>}
    <div className="country-count-list" id={chartId} role="group" aria-label={text("countries")}>{visibleCountries.map((row) => {
      const selected = country === row.key;
      const name = row.name || text("missing");
      return <button type="button" key={row.key} aria-label={`${directoryText(locale, "filter")}: ${name} (${number.format(row.count)})`} aria-pressed={selected} onClick={() => onCountryChange(selected ? "all" : row.key)}>
        <span className="country-row-label"><span>{name}</span><strong>{number.format(row.count)}</strong></span>
        <span className="country-row-bar" aria-hidden="true"><span style={{ width: `${row.count / largestCount * 100}%` }} /></span>
        {selected ? <Check className="country-row-indicator" size={16} aria-hidden="true" /> : <ListFilter className="country-row-indicator" size={16} aria-hidden="true" />}
      </button>;
    })}</div>
    <div className="country-chart-actions">
      {countries.length > 6 && <button type="button" className="country-expand-action" aria-controls={chartId} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{text("allCountries")} ({number.format(countries.length)})<ChevronDown size={15} aria-hidden="true" /></button>}
      {country !== "all" && <button type="button" className="country-reset-action" onClick={() => onCountryChange("all")}><RotateCcw size={14} aria-hidden="true" />{translateAdmin(locale, "common.reset")}</button>}
    </div>
  </div>;
  return <section className={compact ? "tourist-country-report directory-report" : "tourist-country-report"}>
    {compact && <details className="directory-country-breakdown"><summary><ChartNoAxesCombined size={17} aria-hidden="true" /><span>{text("countries")}</span><span className="country-filter-cue">{selectedCountry ? <Check size={14} aria-hidden="true" /> : <ListFilter size={14} aria-hidden="true" />}{selectedCountry ? selectedCountry.name || text("missing") : directoryText(locale, "filter")}</span><ChevronDown className="country-disclosure-chevron" size={16} aria-hidden="true" /></summary>{countryList}</details>}
    <div className="admin-tab-heading">{!compact && <h3>{text("countries")}</h3>}<div className="action-row">
      <button className="secondary-action" type="button" disabled={!rows.length} onClick={() => downloadTouristCsv(rows, locale, fullIdentity)}><Download size={17} />{text("exportCsv")}</button>
      <button className="secondary-action" type="button" disabled={!rows.length} onClick={() => printTouristReport(rows, locale, fullIdentity)}><Printer size={17} />{text("exportPdf")}</button>
    </div></div>
    {!compact && countryList}
    <label className="report-identity-option"><input type="checkbox" checked={fullIdentity} onChange={(event) => setFullIdentity(event.target.checked)} />{text("includeIdentity")}</label>
    <p className="report-export-note">{text("exportNote")}</p>
  </section>;
}
