import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Link2, MapPin, Plus, RotateCcw, Users, X } from "lucide-react";
import type { AttractionCheckIn, Destination } from "../types";
import { groupUnlistedCheckIns, selectPlaceReports, type PlaceSubmissionGroup } from "../services/unlistedPlaces";
import { placeText } from "../services/placeSubmissionCopy";
import { translate, type Locale } from "../services/i18n";
import { formatDateTime } from "../services/geo";
import { uiText } from "../services/uiText";
import { unlistedLocationText } from "../services/unlistedLocationCopy";
import { distanceKm } from "../services/geo";

const CheckInLocationMap = lazy(() => import("./CheckInLocationMap"));

export function UnlistedPlaceReview({ checkIns, destinations, locale, onCreate, onReview, onRefresh, refreshing, onToggleSamples, placeQueueState }: { checkIns: AttractionCheckIn[]; destinations: Destination[]; locale: Locale; onCreate: (group: PlaceSubmissionGroup) => void; onReview: (ids: string[], destinationId: string) => void | Promise<void>; onRefresh?: () => void; refreshing?: boolean; onToggleSamples?: () => void; placeQueueState?: "loading" | "live" | "offline" }) {
  const groups = useMemo(() => groupUnlistedCheckIns(checkIns), [checkIns]);
  const [limit, setLimit] = useState(6);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [queueOpen, setQueueOpen] = useState(groups.length > 0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => { if (groups.length) setQueueOpen(true); }, [groups.length]);
  const reviewGroup = async (group: PlaceSubmissionGroup, destinationId: string) => {
    if (saving) return;
    setSaving(true);
    try { await onReview(group.reports.slice(0, 100).map((report) => report.id), destinationId); }
    finally { setSaving(false); }
  };
  const text = (key: Parameters<typeof placeText>[1]) => placeText(locale, key);
  const locationText = (key: Parameters<typeof unlistedLocationText>[1]) => unlistedLocationText(locale, key);
  return <details className="place-review-queue" open={queueOpen} onToggle={(event) => setQueueOpen(event.currentTarget.open)}>
    <summary><ClipboardCheck size={22} /><span>{text("queue")}</span><strong>{groups.length}</strong></summary>
    <p>{text("guidance")}</p>
    {onRefresh && <button className="secondary-action" type="button" disabled={refreshing} onClick={onRefresh}><RotateCcw size={18} />{translate(locale, "common.refresh")}</button>}
    {onToggleSamples && <button className="secondary-action" type="button" onClick={onToggleSamples}><Plus size={18} />{locationText(checkIns.some((record) => record.isDemo) ? "removeSamples" : "addSamples")}</button>}
    {placeQueueState === "loading" && <p role="status">{translate(locale, "map.loading")}</p>}
    {placeQueueState === "offline" && <p role="alert">{locationText("queueOffline")}</p>}
    {!groups.length && (!placeQueueState || placeQueueState === "live") && <p>{text("empty")}</p>}
    <div className="place-review-list">{groups.slice(0, limit).map((group) => {
      const included = selectPlaceReports(group, excluded);
      const points = group.reports.slice(0, 100).filter((report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude) && Math.abs(report.latitude!) <= 90 && Math.abs(report.longitude!) <= 180).map((report) => ({ latitude: report.latitude!, longitude: report.longitude!, accuracyMeters: report.submittedPlace?.accuracyMeters }));
      const nearby = group.latitude !== undefined && group.longitude !== undefined ? destinations.filter((place) => distanceKm({ latitude: group.latitude!, longitude: group.longitude! }, place) <= 0.1) : [];
      return <article key={group.id} className="place-review-item">
      <div className="place-review-heading"><div><span>{translate(locale, `category.${group.place.category}`)}</span><h3>{group.place.name}</h3><p><MapPin size={16} />{[group.place.city, group.place.state].filter(Boolean).join(", ") || locationText("locationLabel")}</p></div><div className="place-review-counts"><span><Users size={16} />{group.touristCount} {text("people")}</span><span>{group.reports.length} {text("reports")}</span></div></div>
      {group.isDemo && <p className="sample-report-note">{locationText("sampleNote")}</p>}
      {group.reports.length > 1 && <p>{locationText("nearbyGroup")}</p>}
      <details onToggle={(event) => { const open = event.currentTarget.open; setExpanded((current) => { const next = new Set(current); if (open) next.add(group.id); else next.delete(group.id); return next; }); }}><summary>{text("review")}</summary><p>{text("publishNote")}</p>
        {expanded.has(group.id) && points.length > 0 && <Suspense fallback={<p>{translate(locale, "map.loading")}</p>}><CheckInLocationMap points={points} label={locationText("locationLabel")} locale={locale} /></Suspense>}
        {nearby.length > 0 && <p>{locationText("nearbyListed")}: {nearby.map((place) => place.name).join(", ")}</p>}
        <ul>{group.reports.slice(0, 100).map((report) => <li key={report.id}><label className="place-report-choice"><input type="checkbox" checked={!excluded.has(report.id)} disabled={group.isDemo} onChange={(event) => setExcluded((current) => {
          const next = new Set(current);
          if (event.target.checked) next.delete(report.id); else next.add(report.id);
          return next;
        })} /><strong>{report.submittedPlace!.name}</strong></label>{report.submittedPlace!.address && <p>{report.submittedPlace!.address}</p>}<time>{formatDateTime(report.checkedInAt, locale)}</time>{report.submittedPlace!.note && !group.isDemo && <p>{report.submittedPlace!.note}</p>}<small>{report.latitude !== undefined && report.longitude !== undefined ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)} · GPS ±${report.submittedPlace!.accuracyMeters ?? "?"} m` : text("noGps")}</small></li>)}</ul>
        {group.reports.length > 100 && <p>{text("batch")}</p>}
        <div className="place-review-actions"><button className="primary-action" type="button" disabled={saving || !included || group.isDemo} onClick={() => included && onCreate(included)}><Plus size={18} />{text("create")}</button><button className="secondary-action danger" type="button" disabled={saving || !included || group.isDemo} onClick={() => included && void reviewGroup(included, "")}><X size={18} />{text("dismiss")}</button></div>
        <div className="place-review-link"><label>{text("link")}<select value={selected[group.id] ?? ""} disabled={group.isDemo} onChange={(event) => setSelected({ ...selected, [group.id]: event.target.value })}><option value="">{text("known")}</option>{destinations.map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></label><button className="secondary-action" type="button" disabled={saving || !included || !selected[group.id] || group.isDemo} onClick={() => included && void reviewGroup(included, selected[group.id])}><Link2 size={18} />{text("link")}</button></div>
      </details>
    </article>; })}</div>
    {groups.length > limit && <button className="secondary-action" type="button" onClick={() => setLimit(limit + 6)}>{uiText(locale, "Show more")}</button>}
  </details>;
}
