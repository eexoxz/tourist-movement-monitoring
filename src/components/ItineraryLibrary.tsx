import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { Locale } from "../services/i18n";
import type { ItineraryEntry } from "../services/itineraries";
import { itineraryText } from "../services/itineraryCopy";
import { itineraryUiText } from "../services/itineraryUiCopy";

const pageSize = 5;

export function ItineraryLibrary({ entries, selectedId, cloud, busy, locale, onSelect, onCreate }: {
  entries: ItineraryEntry[]; selectedId: string; cloud: boolean; busy: boolean; locale: Locale;
  onSelect: (id: string) => void; onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const previousSelection = useRef(selectedId);
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const date = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }), [locale]);
  const text = (key: Parameters<typeof itineraryText>[1]) => itineraryText(locale, key);
  const copy = (key: Parameters<typeof itineraryUiText>[1]) => itineraryUiText(locale, key);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return search ? entries.filter(({ plan }) => plan.title.toLocaleLowerCase(locale).includes(search)) : entries;
  }, [entries, query, locale]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  // Copies/new plans can be created from the editor as well as the library.
  useEffect(() => {
    if (selectedId === previousSelection.current) return;
    previousSelection.current = selectedId;
    const index = filtered.findIndex(({ plan }) => plan.id === selectedId);
    if (index < 0) { setQuery(""); setPage(0); }
    else setPage(Math.floor(index / pageSize));
  }, [selectedId, filtered]);

  return <section className="itinerary-library" aria-label={text("plans")}>
    <div className="itinerary-library-heading"><h2>{text("plans")} <span>{number.format(entries.length)}</span></h2><button className="primary-action" type="button" onClick={() => { setQuery(""); setPage(0); onCreate(); }} disabled={busy}><Plus size={18} />{text("newPlan")}</button></div>
    {(entries.length > pageSize || query) && <label className="itinerary-library-search"><Search size={17} aria-hidden="true" /><span className="visually-hidden">{copy("search")}</span><input type="search" value={query} placeholder={copy("search")} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label>}
    <div className="itinerary-plan-list">{filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(({ plan, dirty }) => <button type="button" className={`itinerary-plan-row${plan.id === selectedId ? " selected" : ""}`} key={plan.id} aria-pressed={plan.id === selectedId} disabled={busy} onClick={() => onSelect(plan.id)}>
      <span className="itinerary-plan-name"><strong>{plan.title || text("newPlan")}</strong><small>{text("days")}: {number.format(plan.days)} · {text("stops")}: {number.format(plan.stops.length)}{plan.startDate && <> · <time dateTime={plan.startDate}>{date.format(new Date(`${plan.startDate}T12:00:00Z`))}</time></>}</small></span>
      <span className={`itinerary-plan-status${dirty ? " draft" : ""}`}>{copy(dirty ? "draft" : cloud ? "online" : "device")}</span><ChevronRight size={18} aria-hidden="true" />
    </button>)}</div>
    {!filtered.length && query && <p className="itinerary-library-empty" role="status">{copy("noMatches")}</p>}
    {pages > 1 && <nav className="itinerary-library-pagination" aria-label={text("plans")}><span>{copy("page").replace("{page}", number.format(currentPage + 1)).replace("{pages}", number.format(pages))}</span><div><button className="secondary-action icon-action" type="button" aria-label={copy("previous")} disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button><button className="secondary-action icon-action" type="button" aria-label={copy("next")} disabled={busy || currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button></div></nav>}
  </section>;
}
