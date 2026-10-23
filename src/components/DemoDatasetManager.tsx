import { useMemo, useState } from "react";
import { ChevronDown, Download, FlaskConical, RotateCcw, Trash2 } from "lucide-react";
import type { AppData } from "../types";
import { demoDatasetMetadata, getPreparedDemoTouristCount, isSampleTourist } from "../data/demoData";
import { demoDatasetCountries, demoDatasetLimits, demoDatasetPreferences, previewDemoDataset, type DemoDatasetFilters } from "../services/demoDataset";
import { demoControlsText } from "../services/demoDatasetControlsCopy";
import { demoDatasetText } from "../services/demoDatasetCopy";
import { directoryText } from "../services/touristDirectoryCopy";
import { reviewText } from "../services/reviewUpdateCopy";
import { translateAdmin } from "../services/adminI18n";
import { getCategoryLabel } from "../services/profile";
import { translate, type Locale } from "../services/i18n";
import { discoveryText } from "../services/discoveryCopy";
import { PlaceGuideDialog } from "./PlaceGuideDialog";

const countryCodes: Record<string, string> = { Australia: "AU", China: "CN", France: "FR", Germany: "DE", India: "IN", Indonesia: "ID", Japan: "JP", Malaysia: "MY", "New Zealand": "NZ", Singapore: "SG", "South Korea": "KR", Thailand: "TH", "United Kingdom": "GB" };

export function DemoDatasetManager({ data, locale, action, onApply, onRemove, onClose }: {
  data: AppData; locale: Locale; action: "loading" | "removing" | null;
  onApply: (ids: ReadonlySet<string>) => void; onRemove: () => void; onClose: () => void;
}) {
  const [countries, setCountries] = useState<string[]>([...demoDatasetCountries]);
  const [preference, setPreference] = useState<DemoDatasetFilters["preference"]>("all");
  const [limit, setLimit] = useState<number>(demoDatasetMetadata.batchSize);
  const preview = useMemo(() => previewDemoDataset(data, { countries, preference, limit }), [data.users, countries, preference, limit]);
  const loaded = getPreparedDemoTouristCount(data);
  const unchanged = loaded === preview.touristCount && data.users.filter((user) => /^tourist-seed-\d{3}$/.test(user.id) && isSampleTourist(user)).every((user) => preview.userIds.has(user.id));
  const hasSamples = loaded > 0 || data.points.some((point) => point.source === "demo");
  const text = (key: Parameters<typeof demoControlsText>[1], values?: Record<string, number>) => demoControlsText(locale, key, values);
  const admin = (key: Parameters<typeof translateAdmin>[1]) => translateAdmin(locale, key);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const names = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  return <PlaceGuideDialog title={text("manage")} locale={locale} closeLabel={discoveryText(locale, "dismiss")} onClose={onClose}>
    <div className="demo-dataset-manager" aria-busy={Boolean(action)}>
      <div className="demo-dataset-status"><FlaskConical size={20} aria-hidden="true" /><span>{demoDatasetText(locale, "dataNote")}</span></div>
      <p className="demo-dataset-current">{text("current")}: <strong>{demoDatasetText(locale, "progress", { count: loaded, max: demoDatasetMetadata.generatedTouristCount })}</strong></p>
      <fieldset className="demo-dataset-filters" aria-label={text("manage")} disabled={Boolean(action)}>
        <div className="demo-dataset-options">
          <label>{directoryText(locale, "interest")}<select value={preference} onChange={(event) => setPreference(event.target.value as DemoDatasetFilters["preference"])}>
            <option value="all">{directoryText(locale, "anyInterest")}</option>
            {demoDatasetPreferences.map((category) => <option key={category} value={category}>{getCategoryLabel(category, t)}</option>)}
          </select></label>
          <label>{text("limit")}<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            {demoDatasetLimits.map((size) => <option key={size} value={size}>{number(size)}</option>)}
          </select></label>
        </div>
        <details className="demo-dataset-country-picker">
          <summary><span>{reviewText(locale, "country")}</span><strong>{countries.length === demoDatasetCountries.length ? reviewText(locale, "allCountries") : `${number(countries.length)} / ${number(demoDatasetCountries.length)}`}</strong><ChevronDown size={16} /></summary>
          <fieldset className="demo-dataset-countries" aria-label={reviewText(locale, "country")}>
          <label className="demo-dataset-all"><input type="checkbox" checked={countries.length === demoDatasetCountries.length} onChange={(event) => setCountries(event.target.checked ? [...demoDatasetCountries] : [])} />{reviewText(locale, "allCountries")}</label>
          <div>{demoDatasetCountries.map((country) => <label key={country}><input type="checkbox" checked={countries.includes(country)} onChange={(event) => setCountries((current) => event.target.checked ? [...current, country] : current.filter((value) => value !== country))} />{names.of(countryCodes[country]) ?? country}</label>)}</div>
          </fieldset>
        </details>
      </fieldset>
      <section className="demo-dataset-preview" aria-label={text("preview")} aria-live="polite" aria-atomic="true">
        <div><h3>{text("preview")}</h3><span>{text("matches", { count: preview.matchingCount })}</span></div>
        <dl>{[[t("common.tourist"), preview.touristCount], [admin("common.trips"), preview.trips], [admin("common.points"), preview.points], [admin("tourists.checkIns"), preview.checkIns]].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{number(Number(count))}</dd></div>)}</dl>
        {!preview.touristCount && <p>{text("empty")}</p>}
        {preview.touristCount > 0 && unchanged && <p>{text("unchanged")}</p>}
      </section>
      <p className="demo-dataset-note">{text("bounds", { max: demoDatasetMetadata.generatedTouristCount, points: demoDatasetMetadata.generatedTouristCount * demoDatasetMetadata.maxTripsPerTourist * demoDatasetMetadata.maxPointsPerTrip })} {t("admin.demo.localOnlyNote")}</p>
      <div className="demo-dataset-actions">
        <button type="button" className="secondary-action" disabled={Boolean(action) || !hasSamples} onClick={onRemove}><Trash2 size={17} />{action === "removing" ? t("admin.demo.removingButton") : t("admin.demo.removeButton")}</button>
        <button type="button" className="primary-action" disabled={Boolean(action) || !preview.touristCount || unchanged} onClick={() => onApply(preview.userIds)}>{action === "loading" ? <RotateCcw size={17} /> : <Download size={17} />}{action === "loading" ? t("admin.demo.loadingButton") : text(loaded ? "replace" : "load")}</button>
      </div>
    </div>
  </PlaceGuideDialog>;
}
