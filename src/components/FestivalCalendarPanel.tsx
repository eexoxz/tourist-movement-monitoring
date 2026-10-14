import { uiText } from "../services/uiText";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendarDay } from "../services/useCalendarDay";
import { localizeDestinations } from "../services/destinationLocale";
import { ChevronDown, MapPin, SlidersHorizontal } from "lucide-react";
import { interfaceText } from "../services/interfaceCopy";
import { allMalaysianStates } from "../data/festivals";
import type { Destination, FestivalCategory, FestivalEvent, MalaysianState, MovementPoint } from "../types";
import { distanceKm } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import {
  formatFestivalScope,
  formatFestivalStateSummaryLabel,
  getFestivalsForState,
} from "../services/festivals";
import { FestivalEventDetails } from "./FestivalEventDetails";
import { EmptyState } from "./SummaryCards";
import { discoveryText } from "../services/discoveryCopy";

const compactCalendarPreviewLimit = 5;
const fullCalendarPreviewLimit = 6;
const categoryFilters: Array<FestivalCategory | "all"> = ["all", "national", "cultural", "religious", "heritage", "royal", "harvest"];

type FestivalCalendarPanelProps = {
  events: FestivalEvent[];
  destinations: Destination[];
  compact?: boolean;
  locale?: Locale;
  referencePoint?: MovementPoint;
  referenceState?: MalaysianState;
  onOpenCalendar?: () => void;
  initialEventId?: string;
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultEndDate(day?: string) {
  const date = day ? new Date(`${day}T00:00:00`) : new Date();
  date.setDate(date.getDate() + 365);
  return dateInputValue(date);
}

function festivalOverlapsRange(event: FestivalEvent, startDate: string, endDate: string) {
  const start = new Date(`${event.date}T00:00:00`).getTime();
  const end = new Date(`${event.endDate ?? event.date}T23:59:59`).getTime();
  const rangeStart = startDate ? new Date(`${startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const rangeEnd = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return end >= rangeStart && start <= rangeEnd;
}

function inferStateFromDestination(destination?: Destination): MalaysianState | undefined {
  if (!destination) {
    return undefined;
  }

  const searchable = `${destination.city} ${destination.address ?? ""}`.toLowerCase();
  const directMatch = allMalaysianStates.find((state) => searchable.includes(state.toLowerCase()));
  if (directMatch) {
    return directMatch;
  }

  if (searchable.includes("kuala lumpur") || searchable.includes("putrajaya") || searchable.includes("labuan")) {
    return "Federal Territories";
  }

  return undefined;
}

function nearestState(point: MovementPoint | undefined, destinations: Destination[]) {
  if (!point || destinations.length === 0) {
    return undefined;
  }

  const nearest = destinations.reduce<{ destination: Destination; distance: number } | undefined>((current, destination) => {
    const distance = distanceKm(point, destination);
    return !current || distance < current.distance ? { destination, distance } : current;
  }, undefined);

  return inferStateFromDestination(nearest?.destination);
}

function categoryLabelKey(category: FestivalCategory | "all"): TranslationKey {
  return `tourist.events.category.${category}` as TranslationKey;
}

function dateLocale(locale: Locale) {
  const locales: Record<Locale, string> = {
    en: "en-MY",
    es: "es",
    fr: "fr",
    ja: "ja",
    ko: "ko",
    ms: "ms-MY",
    pt: "pt",
    ta: "ta-IN",
    zh: "zh-CN",
  };

  return locales[locale];
}

function formatEventDate(event: FestivalEvent, formatter: Intl.DateTimeFormat) {
  const start = formatter.format(new Date(`${event.date}T00:00:00`));
  if (!event.endDate || event.endDate === event.date) {
    return start;
  }

  return `${start} - ${formatter.format(new Date(`${event.endDate}T00:00:00`))}`;
}

export function FestivalCalendarPanel({ events, destinations, compact = false, locale = "en", referencePoint, referenceState, onOpenCalendar, initialEventId }: FestivalCalendarPanelProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const today = useCalendarDay();
  const previousDefaults = useRef({ start: today, end: getDefaultEndDate(today) });
  const [stateFilter, setStateFilter] = useState<MalaysianState | "all">("all");
  const [startDate, setStartDate] = useState(dateInputValue(new Date()));
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [categoryFilter, setCategoryFilter] = useState<FestivalCategory | "all">("all");
  const [nearMeOnly, setNearMeOnly] = useState(Boolean(referenceState) && !initialEventId);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>(initialEventId ? [initialEventId] : []);
  const dateFormatters = useMemo(() => ({
    full: new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", year: "numeric" }),
    day: new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric" }),
    month: new Intl.DateTimeFormat(dateLocale(locale), { month: "short", year: "numeric" }),
  }), [locale]);
  const destinationById = useMemo(() => new Map(localizeDestinations(destinations, locale).map((destination) => [destination.id, destination])), [destinations, locale]);
  const localState = useMemo(() => referenceState ?? nearestState(referencePoint, destinations), [destinations, referencePoint, referenceState]);
  const effectiveStateFilter = nearMeOnly && localState ? localState : stateFilter;
  const filteredEvents = useMemo(
    () =>
      getFestivalsForState(events, effectiveStateFilter)
        .filter((event) => festivalOverlapsRange(event, startDate, endDate))
        .filter((event) => categoryFilter === "all" || event.category === categoryFilter)
        .sort((a, b) => Number(b.id === initialEventId) - Number(a.id === initialEventId)),
    [categoryFilter, effectiveStateFilter, endDate, events, startDate, initialEventId]
  );
  const visibleLimit = showFullCalendar ? filteredEvents.length : compact ? compactCalendarPreviewLimit : fullCalendarPreviewLimit;
  const visibleEvents = useMemo(() => filteredEvents.slice(0, visibleLimit), [filteredEvents, visibleLimit]);
  const hiddenEventCount = filteredEvents.length - visibleEvents.length;
  const resultScope = effectiveStateFilter === "all" ? "Malaysia" : effectiveStateFilter;

  useEffect(() => {
    const nextEnd = getDefaultEndDate(today);
    const previous = previousDefaults.current;
    setStartDate((current) => current === previous.start ? today : current);
    setEndDate((current) => current === previous.end ? nextEnd : current);
    previousDefaults.current = { start: today, end: nextEnd };
  }, [today]);

  useEffect(() => {
    if (referenceState && !initialEventId) setNearMeOnly(true);
  }, [referenceState, initialEventId]);

  useEffect(() => {
    setShowFullCalendar(false);
  }, [categoryFilter, endDate, nearMeOnly, startDate, stateFilter]);

  const toggleEventStates = (eventId: string) => {
    setExpandedEventIds((currentIds) => (currentIds.includes(eventId) ? currentIds.filter((id) => id !== eventId) : [...currentIds, eventId]));
  };

  return (
    <section className={compact ? "festival-calendar compact" : "festival-calendar"}>
      <div className="section-heading">
        <div>
          <h2>{t("tourist.events.calendarTitle")}</h2>
          <p>
            {filteredEvents.length} {t("tourist.events.upcomingSignals")}{" "}{uiText(locale, "for")}{" "}{resultScope} {t("tourist.events.withinFilters")}.
          </p>
        </div>
        {!compact && (
          <details className="festival-filter-disclosure"><summary><SlidersHorizontal size={18} />{interfaceText(locale, "filters")}<ChevronDown size={18} /></summary><div className="festival-filter-grid">
            <label className="festival-filter">
              {t("tourist.events.fromDate")}
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label className="festival-filter">
              {t("tourist.events.toDate")}
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <label className="festival-filter">
              {t("tourist.events.state")}
              <select value={effectiveStateFilter} onChange={(event) => setStateFilter(event.target.value as MalaysianState | "all")} disabled={nearMeOnly && Boolean(localState)}>
                <option value="all">{t("tourist.events.allMalaysia")}</option>
                {allMalaysianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="festival-filter">
              {t("tourist.events.category")}
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as FestivalCategory | "all")}>
                {categoryFilters.map((category) => (
                  <option key={category} value={category}>
                    {t(categoryLabelKey(category))}
                  </option>
                ))}
              </select>
            </label>
            <label className="festival-nearby-toggle">
              <input type="checkbox" checked={nearMeOnly} onChange={(event) => setNearMeOnly(event.target.checked)} disabled={!localState} />
              <span>{referenceState ? discoveryText(locale, "eventsInArea") : localState ? t("tourist.events.nearMe") : t("tourist.events.nearMeUnavailable")}</span>
            </label>
          </div></details>
        )}
      </div>
      <div className="festival-list">
        {visibleEvents.map((event) => {
          const statesExpanded = expandedEventIds.includes(event.id);
          const eventDate = new Date(`${event.date}T00:00:00`);

          return (
            <article className={`festival-card festival-card-${event.category}`} key={event.id}>
              <div className="festival-date-rail">
                <time dateTime={event.date} aria-label={formatEventDate(event, dateFormatters.full)}><strong className="festival-day">{dateFormatters.day.format(eventDate)}</strong><span className="festival-month">{dateFormatters.month.format(eventDate)}</span></time>
              </div>
              <div className="festival-card-main">
                <div className="festival-card-heading">
                  <span className="festival-category">{t(categoryLabelKey(event.category))}</span><h3>{event.name}</h3>
                </div>
                {event.endDate && event.endDate !== event.date && <time className="festival-date-range" dateTime={event.endDate}>{formatEventDate(event, dateFormatters.full)}</time>}
                {event.venue && <small className="festival-venue"><MapPin size={15} />{event.venue}</small>}
                <div className="festival-state-details">
                  <button type="button" onClick={() => toggleEventStates(event.id)} aria-expanded={statesExpanded}>
                    <MapPin size={15} />{uiText(locale, formatFestivalStateSummaryLabel(event))}<ChevronDown size={15} />
                  </button>
                  {statesExpanded && (
                    <div>
                      <span>{uiText(locale, formatFestivalScope(event))}</span>
                    </div>
                  )}
                </div>
                <FestivalEventDetails event={event} destinationById={destinationById} locale={locale} initiallyOpen={event.id === initialEventId} />
              </div>
            </article>
          );
        })}
      </div>
      {hiddenEventCount > 0 && (
        <button className="festival-more-button" type="button" onClick={onOpenCalendar ?? (() => setShowFullCalendar(true))}>
          {t("tourist.events.showFull")} ({hiddenEventCount})
        </button>
      )}
      {showFullCalendar && !onOpenCalendar && (
        <button className="festival-more-button secondary" type="button" onClick={() => setShowFullCalendar(false)}>
          {t("tourist.events.showFewer")}
        </button>
      )}
      {visibleEvents.length === 0 && <EmptyState text={t("tourist.events.noMatches")} />}
    </section>
  );
}
