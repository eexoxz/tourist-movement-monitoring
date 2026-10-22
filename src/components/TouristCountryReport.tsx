import { Download, Printer } from "lucide-react";
import { useState } from "react";
import type { Locale } from "../services/i18n";
import type { User } from "../types";
import type { TouristManagementRow } from "../services/touristManagement";
import { downloadTouristCsv, getCountryCounts, printTouristReport } from "../services/touristReports";
import { reviewText } from "../services/reviewUpdateCopy";
import { isSampleTourist } from "../data/demoData";
import { demoDatasetText } from "../services/demoDatasetCopy";

export function TouristCountryReport({ users, rows, locale, country, onCountryChange }: {
  users: User[]; rows: TouristManagementRow[]; locale: Locale; country: string; onCountryChange: (country: string) => void;
}) {
  const [fullIdentity, setFullIdentity] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countries = getCountryCounts(users);
  const text = (key: Parameters<typeof reviewText>[1]) => reviewText(locale, key);
  return <section className="tourist-country-report">
    <div className="admin-tab-heading"><h3>{text("countries")}</h3><div className="action-row">
      <button className="secondary-action" type="button" disabled={!rows.length} onClick={() => downloadTouristCsv(rows, locale, fullIdentity)}><Download size={17} />{text("exportCsv")}</button>
      <button className="secondary-action" type="button" disabled={!rows.length} onClick={() => printTouristReport(rows, locale, fullIdentity)}><Printer size={17} />{text("exportPdf")}</button>
    </div></div>
    {users.some(isSampleTourist) && <p className="report-export-note">{demoDatasetText(locale, "dataNote")}</p>}
    <div className="country-count-list">{(expanded ? countries : countries.slice(0, 6)).map((row) => <button type="button" key={row.key} aria-pressed={country === row.key} onClick={() => onCountryChange(country === row.key ? "all" : row.key)}><span>{row.name || text("missing")}</span><strong>{new Intl.NumberFormat(locale).format(row.count)}</strong></button>)}</div>
    {countries.length > 6 && <button type="button" className="text-action" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{text("allCountries")} ({countries.length})</button>}
    <label className="report-identity-option"><input type="checkbox" checked={fullIdentity} onChange={(event) => setFullIdentity(event.target.checked)} />{text("includeIdentity")}</label>
    <p className="report-export-note">{text("exportNote")}</p>
  </section>;
}
