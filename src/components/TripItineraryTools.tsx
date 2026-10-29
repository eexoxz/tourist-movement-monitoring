import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Check, ChevronDown, MapPin, Navigation, X } from "lucide-react";
import type { AttractionCheckIn, Destination, MovementPoint, TripSession } from "../types";
import type { ItineraryEntry } from "../services/itineraries";
import { itineraryScheduleIssues, validItinerary } from "../services/itineraries";
import type { Locale } from "../services/i18n";
import { translate } from "../services/i18n";
import { itineraryText } from "../services/itineraryCopy";
import { tripPlanText } from "../services/tripItineraryCopy";
import { dueItineraryStop, tripItineraryProgress } from "../services/tripItinerary";
import { loadItineraryDismissals, saveItineraryDismissals } from "../services/itineraryReminderState";
import { uiText } from "../services/uiText";
import { emergencyHelpText } from "../services/emergencyHelpCopy";

export type TripPlanSelection = { planId: string; day: number; reminders: boolean };
export function ItineraryTripSetup({ entries, selection, connection, locale, onChange }: {
  entries: ItineraryEntry[]; selection: TripPlanSelection; connection: string; locale: Locale; onChange: (selection: TripPlanSelection) => void;
}) {
  const plans = useMemo(() => entries.filter(({ plan, dirty }) => !dirty && !plan.deletedAt && plan.revision >= 1 && plan.stops.length && validItinerary(plan) && !itineraryScheduleIssues(plan).length).map(({ plan }) => plan), [entries]);
  const plan = plans.find((item) => item.id === selection.planId);
  const text = (key: Parameters<typeof tripPlanText>[1]) => tripPlanText(locale, key);
  const number = new Intl.NumberFormat(locale);
  if (!plans.length && !selection.planId) return <p className="trip-plan-setup-note" role="status">{text(connection === "loading" ? "loading" : "noPlans")}</p>;
  return <section className="trip-plan-setup" aria-label={text("choose")}>
    <div className="trip-plan-choice"><label>{text("choose")}<select value={selection.planId} onChange={(event) => { const next = plans.find((item) => item.id === event.target.value); onChange({ ...selection, planId: event.target.value, day: next?.stops[0]?.day ?? 1 }); }}>
      <option value="">{text("none")}</option>{selection.planId && !plan && <option value={selection.planId} disabled>{text("unavailable")}</option>}{plans.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select></label>{plan && <label>{text("day")}<select value={selection.day} onChange={(event) => onChange({ ...selection, day: Number(event.target.value) })}>{Array.from({ length: plan.days }, (_, i) => i + 1).map((day) => <option key={day} value={day} disabled={!plan.stops.some((stop) => stop.day === day)}>{itineraryText(locale, "day")} {number.format(day)}</option>)}</select></label>}</div>
    {plan && <><p>{text("clock")}</p><label className="trip-plan-reminder-toggle"><input type="checkbox" checked={selection.reminders} onChange={(event) => onChange({ ...selection, reminders: event.target.checked })} />{text("reminders")}</label>{selection.reminders && <small>{text("reminderHelp")}</small>}</>}
    {connection !== "live" && connection !== "loading" && <small>{text("local")}</small>}
  </section>;
}

type ProgressProps = { trip: TripSession; points: MovementPoint[]; checkIns: AttractionCheckIn[]; destinations: Destination[]; locale: Locale; onOpenPlace: (id: string) => void; onCheckIn?: (id: string) => void; onRemindersChange?: (enabled: boolean) => void };
export function TripItineraryProgress({ trip, points, checkIns, destinations, locale, onOpenPlace, onCheckIn, onRemindersChange }: ProgressProps) {
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [trip.id]);
  const progress = useMemo(() => tripItineraryProgress(trip, points, checkIns, destinations), [trip, points, checkIns, destinations]);
  const byId = useMemo(() => new Map(destinations.map((place) => [place.id, place])), [destinations]);
  if (!progress) return null;
  const text = (key: Parameters<typeof tripPlanText>[1]) => tripPlanText(locale, key);
  const active = trip.status === "active";
  return <details className="trip-plan-progress" open={active || undefined}>
    <summary><CalendarDays size={20} aria-hidden="true" /><span><strong>{text(active ? "follow" : "comparison")}: {progress.snapshot.title}</strong><small>{itineraryText(locale, "day")} {new Intl.NumberFormat(locale).format(progress.snapshot.day)} · {tripPlanText(locale, "progress", { visited: new Intl.NumberFormat(locale).format(progress.visited), total: new Intl.NumberFormat(locale).format(progress.stops.length) })}</small></span><ChevronDown className="trip-plan-disclosure" size={18} aria-hidden="true" /></summary>
    <div className="trip-plan-progress-body"><p className="trip-plan-intent">{text("snapshot")} · {progress.snapshot.date} · UTC+8</p><ol>{progress.stops.slice(0, showAll ? progress.stops.length : 3).map((stop) => {
      const place = byId.get(stop.destinationId), recorded = stop.state === "checkIn" || stop.state === "gps";
      return <li key={stop.id}><span className={`trip-plan-visit-state ${stop.state}`} aria-hidden="true">{recorded ? <Check size={17} /> : <MapPin size={17} />}</span><div className="trip-plan-stop-description"><strong>{place?.name ?? itineraryText(locale, "missingPlace")}</strong><small>{stop.arrivalTime ? `${stop.arrivalTime}${stop.departureTime ? `–${stop.departureTime}` : ""} · ` : ""}{text(stop.state)}</small>{stop.note && <p>{stop.note}</p>}<div className="trip-plan-stop-actions">{place && <><button className="text-action" type="button" onClick={() => onOpenPlace(place.id)}>{itineraryText(locale, "viewPlace")}</button><a href={`https://www.openstreetmap.org/directions?to=${place.latitude}%2C${place.longitude}`} target="_blank" rel="noopener noreferrer"><Navigation size={14} aria-hidden="true" />{emergencyHelpText(locale, "directions")}</a>{active && !recorded && onCheckIn && <button className="text-action" type="button" onClick={() => onCheckIn(place.id)}>{translate(locale, "tourist.checkin.checkIn")}</button>}</>}</div></div></li>;
    })}</ol>{progress.stops.length > 3 && <button type="button" className="secondary-action compact" onClick={() => setShowAll((value) => !value)}>{uiText(locale, showAll ? "Show fewer" : "Show more")}</button>}
    {progress.otherIds.length > 0 && <div className="trip-plan-other"><strong>{text("other")}</strong>{progress.otherIds.map((id) => <button key={id} type="button" className="text-action" disabled={!byId.has(id)} onClick={() => onOpenPlace(id)}>{byId.get(id)?.name ?? itineraryText(locale, "missingPlace")}</button>)}</div>}
    <p className="trip-plan-intent">{text("intent")}</p>{active && onRemindersChange && <><label className="trip-plan-reminder-toggle"><input type="checkbox" checked={progress.snapshot.reminders} onChange={(event) => onRemindersChange(event.target.checked)} />{text("reminders")}</label>{progress.snapshot.reminders && <small>{text("reminderHelp")}</small>}</>}
    </div>
  </details>;
}

export function TripItineraryReminder({ trip, points, checkIns, destinations, locale, onOpenPlace, onDisable }: Omit<ProgressProps, "onCheckIn" | "onRemindersChange"> & { onDisable: () => void }) {
  const [now, setNow] = useState(Date.now);
  const [dismissed, setDismissed] = useState(() => loadItineraryDismissals(trip.userId, trip.id));
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const progress = useMemo(() => {
    const result = tripItineraryProgress(trip, points, checkIns, destinations);
    if (!result) return null;
    const available = new Set(destinations.map((place) => place.id));
    return { ...result, stops: result.stops.filter((stop) => available.has(stop.destinationId)) };
  }, [trip, points, checkIns, destinations]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  useEffect(() => {
    if (document.visibilityState !== "visible" || !progress || trip.status !== "active" || !progress.snapshot.reminders) { setVisibleId(null); return; }
    setVisibleId((current) => {
      const existing = progress.stops.find((stop) => stop.id === current && !dismissed.has(stop.id) && stop.state !== "checkIn" && stop.state !== "gps");
      return existing?.id ?? dueItineraryStop(progress, now, dismissed)?.id ?? null;
    });
  }, [progress, now, dismissed, trip.status]);
  const stop = progress?.stops.find((item) => item.id === visibleId), place = stop && destinations.find((item) => item.id === stop.destinationId);
  if (!stop || !place) return null;
  const dismiss = () => { const next = new Set(dismissed).add(stop.id); setDismissed(next); saveItineraryDismissals(trip.userId, trip.id, next); setVisibleId(null); };
  return <aside className="trip-plan-reminder" role="status" aria-live="polite" aria-atomic="true"><Bell size={21} aria-hidden="true" /><div><strong>{tripPlanText(locale, "reminderTitle")}</strong><p>{tripPlanText(locale, "reminderBody", { place: place.name, time: stop.arrivalTime ?? "" })}</p><div><button className="secondary-action compact" type="button" onClick={() => onOpenPlace(place.id)}>{itineraryText(locale, "viewPlace")}</button><button className="text-action" type="button" onClick={onDisable}>{tripPlanText(locale, "disable")}</button></div></div><button type="button" className="icon-action" aria-label={tripPlanText(locale, "dismiss")} onClick={dismiss}><X size={18} /></button></aside>;
}
