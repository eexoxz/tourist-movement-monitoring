import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, FlaskConical, RotateCcw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import type { DestinationCategory } from "../types";
import { translate, type Locale } from "../services/i18n";
import { translateAdmin, type AdminCopyKey } from "../services/adminI18n";
import { directoryPage, defaultDirectoryFilters, filterDirectoryRows, sortDirectoryRows, type DirectoryFilters, type DirectorySort, type DirectorySortKey } from "../services/touristDirectory";
import { directoryText } from "../services/touristDirectoryCopy";
import { demoDatasetText } from "../services/demoDatasetCopy";
import { isSampleTourist } from "../data/demoData";
import type { TouristManagementRow } from "../services/touristManagement";
import { countryKey, getCountryCounts } from "../services/touristReports";
import { reviewText } from "../services/reviewUpdateCopy";
import { profileLabel } from "../services/planningText";
import { formatTravelPreferenceList, getCategoryLabel } from "../services/profile";
import { formatDateTime } from "../services/geo";
import { TouristCountryReport } from "./TouristCountryReport";
import { PlaceGuideDialog } from "./PlaceGuideDialog";

const categories: DestinationCategory[] = ["cultural", "nature", "urban", "heritage", "food", "coastal"];

export function TouristDirectory({ rows, locale, onViewMovement, onViewSafety }: {
  rows: TouristManagementRow[]; locale: Locale; onViewMovement: (userId: string) => void; onViewSafety: () => void;
}) {
  const [filters, setFilters] = useState<DirectoryFilters>({ ...defaultDirectoryFilters });
  const [sort, setSort] = useState<DirectorySort>({ key: "latest", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const text = (key: Parameters<typeof directoryText>[1], values?: Record<string, number>) => directoryText(locale, key, values);
  const admin = (key: AdminCopyKey) => translateAdmin(locale, key);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const countryRows = useMemo(() => filterDirectoryRows(rows, { ...filters, country: "all" }), [rows, filters]);
  const filtered = useMemo(() => countryRows.filter((row) => filters.country === "all" || countryKey(row.tourist) === filters.country), [countryRows, filters.country]);
  const sorted = useMemo(() => sortDirectoryRows(filtered, sort, locale), [filtered, sort, locale]);
  const result = directoryPage(sorted, page, pageSize);
  const selected = rows.find((row) => row.tourist.id === selectedId);
  useEffect(() => { if (page !== result.page) setPage(result.page); }, [page, result.page]);
  useEffect(() => { if (selectedId && !selected) setSelectedId(null); }, [selectedId, selected]);
  const countries = useMemo(() => {
    const counts = getCountryCounts(countryRows.map((row) => row.tourist));
    if (filters.country !== "all" && !counts.some((country) => country.key === filters.country)) counts.push({ key: filters.country, name: rows.find((row) => countryKey(row.tourist) === filters.country)?.tourist.nationality || filters.country, count: 0 });
    return counts;
  }, [countryRows, rows, filters.country]);
  const hasFilters = Object.entries(defaultDirectoryFilters).some(([key, value]) => filters[key as keyof DirectoryFilters] !== value);
  const totals = filtered.reduce((sum, row) => ({ trips: sum.trips + row.totalTrips, visits: sum.visits + row.checkIns, safety: sum.safety + row.openSafetyCases }), { trips: 0, visits: 0, safety: 0 });
  const labels: Record<DirectorySortKey, string> = { name: t("auth.name"), country: reviewText(locale, "country"), profile: admin("tourists.travelStyle"), trips: admin("common.trips"), points: admin("common.points"), checkIns: admin("tourists.checkIns"), safety: admin("tourists.safety"), latest: text("recent") };
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  function resetScroll() { scroller.current?.scrollTo({ top: 0 }); }
  function changeFilter<K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value })); setPage(1); resetScroll();
  }
  function changeSort(key: DirectorySortKey) {
    setSort((current) => ({ key, direction: current.key === key ? current.direction === "asc" ? "desc" : "asc" : ["name", "country", "profile"].includes(key) ? "asc" : "desc" }));
    setPage(1); resetScroll();
  }
  function changePage(next: number) {
    setPage(next); resetScroll(); scroller.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  function source(row: TouristManagementRow) {
    const sample = isSampleTourist(row.tourist);
    return <span className="directory-source">{sample ? <FlaskConical size={12} aria-hidden="true" /> : <ShieldCheck size={12} aria-hidden="true" />}{demoDatasetText(locale, sample ? "sampleRecord" : "realRecord")}</span>;
  }
  return <section className="tourist-directory" aria-label={admin("tourists.title")}>
    <div className="directory-heading"><h2>{admin("tourists.title")}</h2><span aria-live="polite">{text("range", { from: result.from, to: result.to, total: result.total })}</span></div>
    <div className="directory-primary-filters">
      <label className="directory-search"><span>{admin("tourists.search")}</span><div><Search size={17} aria-hidden="true" /><input type="search" value={filters.search} onChange={(event) => changeFilter("search", event.target.value)} placeholder={admin("tourists.search")} /></div></label>
      <label>{reviewText(locale, "country")}<select value={filters.country} onChange={(event) => changeFilter("country", event.target.value)}><option value="all">{reviewText(locale, "allCountries")}</option>{countries.map((country) => <option key={country.key} value={country.key}>{country.name || reviewText(locale, "missing")} ({number(country.count)})</option>)}</select></label>
      <label>{admin("tourists.allProfiles")}<select value={filters.profile} onChange={(event) => changeFilter("profile", event.target.value as DirectoryFilters["profile"])}><option value="all">{admin("tourists.allProfiles")}</option>{(["cultural", "nature", "urban", "mixed"] as const).map((profile) => <option key={profile} value={profile}>{profileLabel(locale, profile)}</option>)}<option value="incomplete">{admin("tourists.incomplete")}</option></select></label>
      <label>{text("source")}<select value={filters.source} onChange={(event) => changeFilter("source", event.target.value as DirectoryFilters["source"])}><option value="all">{text("allSources")}</option><option value="registered">{demoDatasetText(locale, "realRecord")}</option><option value="sample">{demoDatasetText(locale, "sampleRecord")}</option></select></label>
    </div>
    <div className="directory-filter-actions">
      <details className="directory-more-filters"><summary><SlidersHorizontal size={16} />{text("filters")}</summary><div className="directory-extra-filters">
        <label>{text("activity")}<select value={filters.activity} onChange={(event) => changeFilter("activity", event.target.value as DirectoryFilters["activity"])}><option value="all">{text("allActivity")}</option><option value="active">{admin("tourists.activeTrips")}</option><option value="trips">{text("hasTrips")}</option><option value="none">{text("noTrips")}</option></select></label>
        <label>{admin("tourists.safety")}<select value={filters.safety} onChange={(event) => changeFilter("safety", event.target.value as DirectoryFilters["safety"])}><option value="all">{text("allSafety")}</option><option value="open">{admin("tourists.openSafety")}</option><option value="clear">{text("noSafety")}</option></select></label>
        <label>{text("consent")}<select value={filters.consent} onChange={(event) => changeFilter("consent", event.target.value as DirectoryFilters["consent"])}><option value="all">{text("anyConsent")}</option><option value="granted">{admin("tourists.locationConsentActive")}</option><option value="missing">{admin("tourists.noActiveConsent")}</option></select></label>
        <label>{reviewText(locale, "identity")}<select value={filters.identity} onChange={(event) => changeFilter("identity", event.target.value as DirectoryFilters["identity"])}><option value="all">{reviewText(locale, "allIdentity")}</option><option value="provided">{reviewText(locale, "withIdentity")}</option><option value="missing">{reviewText(locale, "missingIdentity")}</option></select></label>
        <label>{text("interest")}<select value={filters.interest} onChange={(event) => changeFilter("interest", event.target.value as DirectoryFilters["interest"])}><option value="all">{text("anyInterest")}</option>{categories.map((category) => <option key={category} value={category}>{getCategoryLabel(category, t)}</option>)}</select></label>
      </div></details>
      <button type="button" className="directory-reset" disabled={!hasFilters} onClick={() => { setFilters({ ...defaultDirectoryFilters }); setPage(1); resetScroll(); }}><RotateCcw size={15} />{admin("common.reset")}</button>
    </div>
    <div className="directory-totals"><span><strong>{number(filtered.length)}</strong> {t("common.tourist")}</span><span><strong>{number(totals.trips)}</strong> {admin("common.trips")}</span><span><strong>{number(totals.visits)}</strong> {admin("tourists.checkIns")}</span><span className={totals.safety ? "has-open-cases" : ""}><strong>{number(totals.safety)}</strong> {admin("tourists.openSafety")}</span></div>
    <TouristCountryReport users={countryRows.map((row) => row.tourist)} rows={sorted} locale={locale} country={filters.country} onCountryChange={(country) => changeFilter("country", country)} compact />
    <div className="directory-mobile-sort"><label>{text("sort")}<select value={sort.key} onChange={(event) => changeSort(event.target.value as DirectorySortKey)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" className="icon-action" title={text(sort.direction === "asc" ? "ascending" : "descending")} aria-label={text(sort.direction === "asc" ? "ascending" : "descending")} onClick={() => changeSort(sort.key)}>{sort.direction === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}</button></div>
    <div className="directory-table-scroll" ref={scroller} tabIndex={0} aria-label={admin("tourists.title")}>
      <table className="directory-table"><caption className="sr-only">{admin("tourists.title")}</caption><thead><tr>{Object.entries(labels).map(([key, label]) => <th key={key} scope="col" className={`directory-col-${key}`} aria-sort={sort.key === key ? sort.direction === "asc" ? "ascending" : "descending" : "none"}><button type="button" onClick={() => changeSort(key as DirectorySortKey)} title={`${text("sort")}: ${label}`}>{label}{sort.key === key ? sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ArrowUpDown size={13} />}</button></th>)}</tr></thead><tbody>
        {result.rows.map((row) => <tr key={row.tourist.id} className={row.openSafetyCases ? "directory-needs-help" : ""}>
          <th scope="row"><button type="button" className="directory-person" aria-label={`${text("details")}: ${row.tourist.name}`} onClick={() => setSelectedId(row.tourist.id)}><strong>{row.tourist.name}</strong>{source(row)}<span className="directory-mobile-country">{row.tourist.nationality || admin("common.notProvided")}</span></button></th>
          <td className="directory-col-country">{row.tourist.nationality || admin("common.notProvided")}</td><td className="directory-col-profile">{row.profile ? profileLabel(locale, row.profile) : admin("tourists.profilePending")}</td><td className="directory-numeric directory-col-trips">{number(row.totalTrips)}</td><td className="directory-numeric directory-col-points">{number(row.movementPoints)}</td><td className="directory-numeric directory-col-checkIns">{number(row.checkIns)}</td><td className="directory-numeric directory-col-safety"><span className={row.openSafetyCases ? "directory-case-count" : ""}>{number(row.openSafetyCases)}</span></td><td className="directory-col-latest">{row.latestActivityAt && Number.isFinite(Date.parse(row.latestActivityAt)) ? <time dateTime={row.latestActivityAt} title={formatDateTime(row.latestActivityAt, locale)}>{new Intl.DateTimeFormat(locale, { dateStyle: "short" }).format(new Date(row.latestActivityAt))}</time> : admin("common.notProvided")}</td>
        </tr>)}
        {!result.total && <tr><td colSpan={8} className="directory-empty">{admin("tourists.empty")}</td></tr>}
      </tbody></table>
    </div>
    <div className="directory-pagination"><label>{text("rows")}<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); resetScroll(); }}>{[10, 25, 50].map((size) => <option key={size} value={size}>{number(size)}</option>)}</select></label><span aria-live="polite">{text("page", { page: result.page, pages: result.pages })}</span><div><button type="button" className="icon-action" title={text("previous")} aria-label={text("previous")} disabled={result.page === 1} onClick={() => changePage(result.page - 1)}><ChevronLeft size={19} /></button><button type="button" className="icon-action" title={text("next")} aria-label={text("next")} disabled={result.page === result.pages} onClick={() => changePage(result.page + 1)}><ChevronRight size={19} /></button></div></div>
    {selected && <PlaceGuideDialog title={selected.tourist.name} locale={locale} closeLabel={text("close")} onClose={() => setSelectedId(null)}><section className="directory-detail">
      {source(selected)}<p>{selected.latestActivityAt ? `${text("recent")}: ${formatDateTime(selected.latestActivityAt, locale)}` : admin("tourists.noActivity")}</p>
      <dl>{[
        [reviewText(locale, "touristId"), selected.tourist.id], [admin("tourists.email"), selected.tourist.email], [admin("tourists.nationality"), selected.tourist.nationality], [admin("tourists.passport"), selected.tourist.passportNumber], [admin("tourists.travelStyle"), formatTravelPreferenceList(selected.tourist.travelPreferences, locale)], [text("consent"), selected.consentGranted ? admin("tourists.locationConsentActive") : admin("tourists.noActiveConsent")], [admin("common.trips"), number(selected.totalTrips)], [admin("common.points"), number(selected.movementPoints)], [admin("tourists.checkIns"), number(selected.checkIns)], [admin("tourists.openSafety"), number(selected.openSafetyCases)], [admin("tourists.emergencyContact"), selected.tourist.emergencyContactPhone ? `${selected.tourist.emergencyContactName || admin("tourists.savedContact")} · ${selected.tourist.emergencyContactPhone}` : undefined], [admin("tourists.recentPlaces"), selected.latestDestinationNames.join(", ") || admin("tourists.noRecognisedPlaces")],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || admin("common.notProvided")}</dd></div>)}</dl>
      <div className="directory-detail-actions"><button type="button" className="secondary-action" onClick={() => { setSelectedId(null); onViewMovement(selected.tourist.id); }}>{admin("tourists.viewMovement")}</button><button type="button" className="secondary-action" onClick={() => { setSelectedId(null); onViewSafety(); }}>{admin("tourists.viewSafety")}</button></div>
    </section></PlaceGuideDialog>}
  </section>;
}
