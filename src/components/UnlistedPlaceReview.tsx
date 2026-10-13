import { useMemo, useState } from "react";
import { ClipboardCheck, Link2, MapPin, Plus, RotateCcw, Users, X } from "lucide-react";
import type { AttractionCheckIn, Destination } from "../types";
import { groupUnlistedCheckIns, selectPlaceReports, type PlaceSubmissionGroup } from "../services/unlistedPlaces";
import { placeText } from "../services/placeSubmissionCopy";
import { translate, type Locale } from "../services/i18n";
import { formatDateTime } from "../services/geo";
import { uiText } from "../services/uiText";

export function UnlistedPlaceReview({ checkIns, destinations, locale, onCreate, onReview, onRefresh, refreshing }: { checkIns: AttractionCheckIn[]; destinations: Destination[]; locale: Locale; onCreate: (group: PlaceSubmissionGroup) => void; onReview: (ids: string[], destinationId: string) => void | Promise<void>; onRefresh?: () => void; refreshing?: boolean }) {
  const groups = useMemo(() => groupUnlistedCheckIns(checkIns), [checkIns]);
  const [limit, setLimit] = useState(6);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const reviewGroup = async (group: PlaceSubmissionGroup, destinationId: string) => {
    if (saving) return;
    setSaving(true);
    try { await onReview(group.reports.slice(0, 100).map((report) => report.id), destinationId); }
    finally { setSaving(false); }
  };
  const text = (key: Parameters<typeof placeText>[1]) => placeText(locale, key);
  return <details className="place-review-queue">
    <summary><ClipboardCheck size={22} /><span>{text("queue")}</span><strong>{groups.length}</strong></summary>
    <p>{text("guidance")}</p>
    {onRefresh && <button className="secondary-action" type="button" disabled={refreshing} onClick={onRefresh}><RotateCcw size={18} />{translate(locale, "common.refresh")}</button>}
    {!groups.length && <p>{text("empty")}</p>}
    <div className="place-review-list">{groups.slice(0, limit).map((group) => {
      const included = selectPlaceReports(group, excluded);
      return <article key={group.id} className="place-review-item">
      <div className="place-review-heading"><div><span>{translate(locale, `category.${group.place.category}`)}</span><h3>{group.place.name}</h3><p><MapPin size={16} />{group.place.city}, {group.place.state}</p></div><div className="place-review-counts"><span><Users size={16} />{group.touristCount} {text("people")}</span><span>{group.reports.length} {text("reports")}</span></div></div>
      <details><summary>{text("review")}</summary><p>{text("publishNote")}</p><ul>{group.reports.slice(0, 100).map((report) => <li key={report.id}><label className="place-report-choice"><input type="checkbox" checked={!excluded.has(report.id)} onChange={(event) => setExcluded((current) => {
          const next = new Set(current);
          if (event.target.checked) next.delete(report.id); else next.add(report.id);
          return next;
        })} /><strong>{report.submittedPlace!.address}</strong></label><time>{formatDateTime(report.checkedInAt, locale)}</time>{report.submittedPlace!.note && <p>{report.submittedPlace!.note}</p>}<small>{report.latitude !== undefined && report.longitude !== undefined ? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)} · GPS ±${report.submittedPlace!.accuracyMeters ?? "?"} m` : text("noGps")}</small></li>)}</ul>
        {group.reports.length > 100 && <p>{text("batch")}</p>}
        <div className="place-review-actions"><button className="primary-action" type="button" disabled={saving || !included} onClick={() => included && onCreate(included)}><Plus size={18} />{text("create")}</button><button className="secondary-action danger" type="button" disabled={saving || !included} onClick={() => included && void reviewGroup(included, "")}><X size={18} />{text("dismiss")}</button></div>
        <div className="place-review-link"><label>{text("link")}<select value={selected[group.id] ?? ""} onChange={(event) => setSelected({ ...selected, [group.id]: event.target.value })}><option value="">{text("known")}</option>{destinations.map((place) => <option key={place.id} value={place.id}>{place.name} · {place.city}</option>)}</select></label><button className="secondary-action" type="button" disabled={saving || !included || !selected[group.id]} onClick={() => included && void reviewGroup(included, selected[group.id])}><Link2 size={18} />{text("link")}</button></div>
      </details>
    </article>; })}</div>
    {groups.length > limit && <button className="secondary-action" type="button" onClick={() => setLimit(limit + 6)}>{uiText(locale, "Show more")}</button>}
  </details>;
}
