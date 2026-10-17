import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Check, Clock3, Copy, MapPinned, Plus, RotateCcw, Save, Search, Trash2, X } from "lucide-react";
import type { Destination, Itinerary, User } from "../types";
import type { Locale } from "../services/i18n";
import { translate } from "../services/i18n";
import { addItineraryStop, itineraryDayDate, itineraryLimits, moveItineraryStop, validItinerary } from "../services/itineraries";
import { itineraryText } from "../services/itineraryCopy";
import { useItineraries } from "../services/useItineraries";
import { DestinationVisual } from "./DestinationVisual";
import { Page } from "./Page";

function VisitMinutes({ value, label, onChange }: { value: number; label: string; onChange: (minutes: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <label>{label}<input type="number" inputMode="numeric" min={5} max={itineraryLimits.minutes} step={5} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={() => {
    const next = draft.trim() && Number.isFinite(Number(draft)) ? Math.max(5, Math.min(itineraryLimits.minutes, Math.round(Number(draft)))) : value;
    setDraft(String(next));
    if (next !== value) onChange(next);
  }} /></label>;
}

function ConfirmItineraryDialog({ locale, busy, kind, planName, onCancel, onConfirm }: { locale: Locale; busy: boolean; kind: "delete" | "discard"; planName: string; onCancel: () => void; onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const text = (key: Parameters<typeof itineraryText>[1]) => itineraryText(locale, key);
  return <div className="modal-overlay trip-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="itinerary-delete-title" aria-describedby="itinerary-delete-description" onClick={(event) => { if (!busy && event.target === event.currentTarget) onCancel(); }} onKeyDown={(event) => {
    if (event.key === "Escape" && !busy) onCancel();
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  }}>
    <section className="modal-card trip-action-dialog">
      <div className="trip-dialog-heading"><span className="trip-dialog-icon">{kind === "delete" ? <Trash2 size={22} /> : <RotateCcw size={22} />}</span><h2 id="itinerary-delete-title">{text(kind === "delete" ? "deleteTitle" : "discard")}</h2></div>
      <strong>{planName}</strong>
      <p id="itinerary-delete-description">{text(kind === "delete" ? "deleteAsk" : "discardAsk")}</p>
      <div className="trip-dialog-actions"><button ref={cancel} className="secondary-action" type="button" onClick={onCancel} disabled={busy}>{text("cancel")}</button><button className={`primary-action ${kind === "delete" ? "itinerary-delete-action" : ""}`} type="button" onClick={onConfirm} disabled={busy}>{kind === "delete" ? <Trash2 size={18} /> : <RotateCcw size={18} />}{text(kind)}</button></div>
    </section>
  </div>;
}

export function ItineraryPage({ user, destinations, suggestedIds = [], locale, onBack, onOpenPlace }: {
  user: User; destinations: Destination[]; suggestedIds?: string[]; locale: Locale; onBack: () => void; onOpenPlace: (id: string) => void;
}) {
  const store = useItineraries(user);
  const [selectedId, setSelectedId] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [confirmation, setConfirmation] = useState<{ kind: "delete" | "discard"; plan: Itinerary } | null>(null);
  const text = (key: Parameters<typeof itineraryText>[1]) => itineraryText(locale, key);
  const entry = store.entries.find((candidate) => candidate.plan.id === selectedId) ?? store.entries[0];
  const plan = entry?.plan;
  const day = plan ? Math.min(selectedDay, plan.days) : 1;
  const number = new Intl.NumberFormat(locale);
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const byId = useMemo(() => new Map(destinations.map((place) => [place.id, place])), [destinations]);
  const areas = useMemo(() => [...new Set(destinations.map((place) => place.city))].sort(), [destinations]);
  const suggestions = useMemo(() => new Set(suggestedIds), [suggestedIds]);
  const matches = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return destinations.filter((place) => (!area || place.city === area) && (!search || `${place.name} ${place.city} ${place.description}`.toLocaleLowerCase(locale).includes(search)))
      .sort((a, b) => Number(suggestions.has(b.id)) - Number(suggestions.has(a.id)) || a.name.localeCompare(b.name, locale));
  }, [destinations, area, query, suggestions, locale]);
  const stops = plan?.stops.filter((stop) => stop.day === day) ?? [];
  const remote = store.remote.find((candidate) => candidate.id === plan?.id);
  const conflict = Boolean(plan && entry.dirty && ((remote && (remote.deletedAt || remote.revision !== plan.revision)) || (store.connection === "live" && plan.revision > 0 && !remote)));
  const update = (patch: Partial<Itinerary>) => { if (plan) store.change({ ...plan, ...patch }); };
  const newPlan = (source?: Itinerary) => {
    setSelectedId(store.create(source ? `${source.title.slice(0, 60)} (${text("copyName")})` : text("newPlan"), source));
    if (source && remote?.id === source.id) store.restore(remote);
    setSelectedDay(1);
  };
  const changeDay = (nextDay: number) => { setSelectedDay(nextDay); setVisibleCount(6); };
  const minimumDays = Math.max(1, ...(plan?.stops.map((stop) => stop.day) ?? []));

  return <Page title={text("title")} eyebrow={translate(locale, "nav.trips")} actions={<button className="secondary-action" type="button" onClick={onBack}><ArrowLeft size={18} />{text("back")}</button>}>
    <div className="itinerary-toolbar">
      <label>{text("plans")}<select value={plan?.id ?? ""} onChange={(event) => { setSelectedId(event.target.value); changeDay(1); }} disabled={store.busy || !plan}>
        {!plan && <option value="">{text("noPlans")}</option>}
        {store.entries.map(({ plan: item }) => <option key={item.id} value={item.id}>{item.title || text("newPlan")}</option>)}
      </select></label>
      <button className="secondary-action" type="button" onClick={() => newPlan()} disabled={store.busy}><Plus size={18} />{text("newPlan")}</button>
      {plan && <button className="secondary-action icon-action" type="button" title={text("saveCopy")} aria-label={text("saveCopy")} onClick={() => newPlan(plan)} disabled={store.busy}><Copy size={18} /></button>}
    </div>

    {(store.notice || store.connection !== "live") && <div className={`itinerary-notice ${store.notice === "conflict" || store.notice === "unavailable" || store.connection === "unavailable" ? "warning" : ""}`} role="status">
      <span>{text(store.notice ?? (store.connection === "live" ? "saved" : store.connection === "local" ? "local" : store.connection === "loading" ? "loading" : "unavailable"))}</span>
      {store.connection === "unavailable" && <button className="secondary-action compact" type="button" onClick={store.reconnect} disabled={store.busy}><RotateCcw size={16} />{text("reconnect")}</button>}
    </div>}

    {!plan ? <section className="itinerary-empty"><MapPinned size={40} aria-hidden="true" /><h2>{text("noPlans")}</h2><button className="primary-action" type="button" onClick={() => newPlan()}><Plus size={18} />{text("newPlan")}</button></section> : <>
      {(conflict || store.notice === "conflict") && <aside className="itinerary-notice warning" role="alert"><p>{text("conflict")}</p><div className="itinerary-inline-actions"><button className="secondary-action" type="button" onClick={() => newPlan(plan)} disabled={store.busy}><Copy size={18} />{text("saveCopy")}</button>{remote && <button className="secondary-action" type="button" onClick={() => setConfirmation({ kind: "discard", plan })} disabled={store.busy}><RotateCcw size={18} />{text("loadLatest")}</button>}</div></aside>}

      <fieldset className="itinerary-editor" disabled={store.busy}>
        <legend className="visually-hidden">{text("title")}</legend>
        <div className="itinerary-heading-fields">
          <label>{text("planName")}<input value={plan.title} maxLength={itineraryLimits.title} required onChange={(event) => update({ title: event.target.value })} /></label>
          <label>{text("startDate")}<input type="date" min="2000-01-01" max="2100-12-31" value={plan.startDate} onInput={(event) => update({ startDate: event.currentTarget.value })} /></label>
          <label>{text("days")}<select value={plan.days} onChange={(event) => update({ days: Number(event.target.value) })}>{Array.from({ length: itineraryLimits.days }, (_, i) => i + 1).map((value) => <option key={value} value={value} disabled={value < minimumDays}>{number.format(value)}</option>)}</select></label>
        </div>
        <details className="itinerary-notes"><summary>{text("notes")}</summary><label><span className="visually-hidden">{text("notes")}</span><textarea rows={3} value={plan.notes} maxLength={itineraryLimits.notes} onChange={(event) => update({ notes: event.target.value })} /></label></details>

        <nav className="itinerary-days" aria-label={text("days")}>{Array.from({ length: plan.days }, (_, i) => i + 1).map((value) => <button type="button" className={day === value ? "is-selected" : ""} aria-current={day === value ? "step" : undefined} key={value} onClick={() => changeDay(value)}><CalendarDays size={16} />{text("day")} {number.format(value)}<small>{number.format(plan.stops.filter((stop) => stop.day === value).length)}</small></button>)}</nav>

        <div className="itinerary-layout">
          <section className="itinerary-day-plan" aria-labelledby="itinerary-day-title">
            <header className="itinerary-day-heading"><h2 id="itinerary-day-title">{text("day")} {number.format(day)}</h2>{itineraryDayDate(plan.startDate, day) && <time>{dateFormat.format(itineraryDayDate(plan.startDate, day))}</time>}</header>
            <div className="itinerary-day-summary"><span><MapPinned size={16} />{text("stops")}: {number.format(stops.length)}</span><span><Clock3 size={16} />{number.format(stops.reduce((sum, stop) => sum + stop.minutes, 0))} {translate(locale, "common.minutes")}</span></div>
            {!stops.length && <p className="itinerary-day-empty">{text("empty")}</p>}
            <ol className="itinerary-stops">{stops.map((stop, index) => {
              const place = byId.get(stop.destinationId);
              return <li key={stop.id} className="itinerary-stop">
                <div className="itinerary-stop-heading"><span className="itinerary-stop-order">{number.format(index + 1)}</span>{place && <DestinationVisual destination={place} locale={locale} compact />}<div><h3>{place?.name ?? text("missingPlace")}</h3>{place && <span>{place.city}</span>}</div><button className="secondary-action icon-action" type="button" aria-label={`${text("remove")}: ${place?.name ?? index + 1}`} title={text("remove")} onClick={() => update({ stops: plan.stops.filter((item) => item.id !== stop.id) })}><X size={18} /></button></div>
                <div className="itinerary-stop-fields"><VisitMinutes value={stop.minutes} label={text("minutes")} onChange={(minutes) => update({ stops: plan.stops.map((item) => item.id === stop.id ? { ...item, minutes } : item) })} /><label>{text("moveDay")}<select value={stop.day} onChange={(event) => update({ stops: plan.stops.map((item) => item.id === stop.id ? { ...item, day: Number(event.target.value) } : item) })}>{Array.from({ length: plan.days }, (_, i) => i + 1).map((value) => <option key={value} value={value} disabled={plan.stops.some((item) => item.id !== stop.id && item.destinationId === stop.destinationId && item.day === value)}>{text("day")} {number.format(value)}</option>)}</select></label></div>
                <details><summary>{text("stopNote")}</summary><label><span className="visually-hidden">{text("stopNote")}</span><textarea rows={2} maxLength={itineraryLimits.stopNote} value={stop.note} onChange={(event) => update({ stops: plan.stops.map((item) => item.id === stop.id ? { ...item, note: event.target.value } : item) })} /></label></details>
                <div className="itinerary-stop-actions"><button className="secondary-action icon-action" type="button" aria-label={`${text("up")}: ${place?.name ?? index + 1}`} title={text("up")} disabled={index === 0} onClick={() => store.change(moveItineraryStop(plan, stop.id, -1))}><ArrowUp size={18} /></button><button className="secondary-action icon-action" type="button" aria-label={`${text("down")}: ${place?.name ?? index + 1}`} title={text("down")} disabled={index === stops.length - 1} onClick={() => store.change(moveItineraryStop(plan, stop.id, 1))}><ArrowDown size={18} /></button>{place && <button className="secondary-action compact" type="button" onClick={() => onOpenPlace(place.id)}><MapPinned size={16} />{text("viewPlace")}</button>}</div>
              </li>;
            })}</ol>
          </section>

          <section className="itinerary-catalogue" aria-labelledby="itinerary-add-title">
            <h2 id="itinerary-add-title"><Plus size={20} />{text("addPlace")}</h2>
            <div className="itinerary-catalogue-filters"><label><span><Search size={16} />{text("search")}</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(6); }} /></label><label>{text("area")}<select value={area} onChange={(event) => { setArea(event.target.value); setVisibleCount(6); }}><option value="">{text("allAreas")}</option>{areas.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
            <ul className="itinerary-place-results">{matches.slice(0, visibleCount).map((place) => {
              const added = plan.stops.some((stop) => stop.destinationId === place.id && stop.day === day);
              return <li key={place.id}><DestinationVisual destination={place} locale={locale} compact /><div><strong>{place.name}</strong><span>{place.city}</span>{suggestions.has(place.id) && <small>{text("suggested")}</small>}</div><button className="secondary-action icon-action" type="button" title={text(added ? "added" : "add")} aria-label={`${text(added ? "added" : "add")}: ${place.name}`} disabled={added || plan.stops.length >= itineraryLimits.stops} onClick={() => store.change(addItineraryStop(plan, place, day))}>{added ? <Check size={18} /> : <Plus size={18} />}</button></li>;
            })}</ul>
            {!matches.length && <p>{text("noMatches")}</p>}
            {visibleCount < matches.length && <button className="secondary-action wide" type="button" onClick={() => setVisibleCount((value) => value + 6)}><Plus size={16} />{text("showMore")}</button>}
            <small className="itinerary-limit">{text("limit")}</small>
          </section>
        </div>
      </fieldset>

      <p className="itinerary-planning-note">{text("travelNotice")}</p>
      <footer className="itinerary-save-bar"><div role="status">{(entry.dirty || store.connection === "live") && <span>{text(entry.dirty ? "unsaved" : "saved")}</span>}<small>{text("stops")}: {number.format(plan.stops.length)} · {text("total")}: {number.format(plan.stops.reduce((sum, stop) => sum + stop.minutes, 0))} {translate(locale, "common.minutes")}</small></div><div className="itinerary-inline-actions">
        {entry.dirty && remote && !remote.deletedAt && <button className="secondary-action" type="button" disabled={store.busy} onClick={() => setConfirmation({ kind: "discard", plan })}><RotateCcw size={18} />{text("discard")}</button>}
        <button className="secondary-action icon-action danger" type="button" aria-label={text("delete")} title={text("delete")} disabled={store.busy} onClick={() => setConfirmation({ kind: "delete", plan })}><Trash2 size={18} /></button>
        <button className="primary-action" type="button" disabled={store.busy || !entry.dirty || !plan.title.trim() || !validItinerary(plan) || conflict} onClick={() => void store.commit(plan)} aria-busy={store.busy}><Save size={18} />{text(store.busy ? "saving" : "save")}</button>
      </div></footer>
    </>}
    {confirmation && <ConfirmItineraryDialog locale={locale} busy={store.busy} kind={confirmation.kind} planName={confirmation.plan.title} onCancel={() => setConfirmation(null)} onConfirm={() => {
      if (confirmation.kind === "discard") {
        const latest = store.remote.find((candidate) => candidate.id === confirmation.plan.id);
        if (latest) store.restore(latest);
        setConfirmation(null);
      } else void store.commit(confirmation.plan, true).finally(() => setConfirmation(null));
    }} />}
  </Page>;
}
