import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { allMalaysianStates } from "../data/festivals";
import type { Destination, FestivalCategory, FestivalEvent, MalaysianState, MovementPoint } from "../types";
import { distanceKm } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import {
  formatFestivalScope,
  formatFestivalStateSummaryLabel,
  getFestivalsForState,
} from "../services/festivals";
import { DestinationVisual } from "./DestinationVisual";
import { EmptyState } from "./SummaryCards";

const compactCalendarPreviewLimit = 5;
const fullCalendarPreviewLimit = 6;
const categoryFilters: Array<FestivalCategory | "all"> = ["all", "national", "cultural", "religious", "heritage", "royal", "harvest"];

type FestivalCalendarPanelProps = {
  events: FestivalEvent[];
  destinations: Destination[];
  compact?: boolean;
  locale?: Locale;
  referencePoint?: MovementPoint;
  onOpenCalendar?: () => void;
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultEndDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
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

function formatEventDate(event: FestivalEvent, locale: Locale) {
  const formatter = new Intl.DateTimeFormat(dateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const start = formatter.format(new Date(`${event.date}T00:00:00`));
  if (!event.endDate || event.endDate === event.date) {
    return start;
  }

  return `${start} - ${formatter.format(new Date(`${event.endDate}T00:00:00`))}`;
}

function eventDescription(event: FestivalEvent, locale: Locale, t: (key: TranslationKey) => string) {
  if (locale === "en") {
    return event.description;
  }

  const category = t(categoryLabelKey(event.category));
  const scope = event.scope === "national" ? t("tourist.events.allMalaysia") : event.states.join(", ");

  const templates: Record<Locale, string> = {
    en: event.description,
    ms: `Acara ${category.toLowerCase()} ini boleh mempengaruhi pergerakan pelancong di ${scope}. Gunakan isyarat ini semasa merancang tarikh dan tempat lawatan.`,
    zh: `这项${category}活动可能会影响 ${scope} 的游客流动。规划日期和地点时，可把它作为参考。`,
    ja: `この${category}イベントは、${scope}周辺の観光客の動きに影響する可能性があります。日程や訪問先を決める参考にできます。`,
    ko: `이 ${category} 이벤트는 ${scope} 지역의 관광객 이동에 영향을 줄 수 있습니다. 날짜와 방문지를 계획할 때 참고하세요.`,
    pt: `Este evento de ${category.toLowerCase()} pode influenciar o movimento turístico em ${scope}. Use este sinal ao planear datas e locais de visita.`,
    ta: `இந்த ${category} நிகழ்வு ${scope} பகுதியில் சுற்றுலா நகர்வை பாதிக்கலாம். பயண தேதி மற்றும் இடங்களை திட்டமிட இதை பயன்படுத்தலாம்.`,
    es: `Este evento de ${category.toLowerCase()} puede influir en el movimiento turístico en ${scope}. Úsalo al planificar fechas y lugares de visita.`,
    fr: `Cet événement ${category.toLowerCase()} peut influencer le mouvement touristique à ${scope}. Utilisez ce signal pour planifier les dates et les lieux de visite.`,
  };

  return templates[locale] ?? event.description;
}

function getMatchedDestinations(event: FestivalEvent, destinationById: Map<string, Destination>) {
  return event.destinationIds.flatMap((destinationId) => {
    const destination = destinationById.get(destinationId);
    return destination ? [destination] : [];
  });
}

function getPlanningSummary(matchedDestinations: Destination[]) {
  if (matchedDestinations.length === 0) {
    return "No linked place has been added yet. Use current movement demand to find suitable nearby destinations for this state.";
  }

  const cityNames = Array.from(new Set(matchedDestinations.map((destination) => destination.city)));
  return `These places may become busier around this event. Compare demand in ${cityNames.join(", ")} before planning a route.`;
}

export function FestivalCalendarPanel({ events, destinations, compact = false, locale = "en", referencePoint, onOpenCalendar }: FestivalCalendarPanelProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [stateFilter, setStateFilter] = useState<MalaysianState | "all">("all");
  const [startDate, setStartDate] = useState(dateInputValue(new Date()));
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [categoryFilter, setCategoryFilter] = useState<FestivalCategory | "all">("all");
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  const destinationById = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const localState = useMemo(() => nearestState(referencePoint, destinations), [destinations, referencePoint]);
  const effectiveStateFilter = nearMeOnly && localState ? localState : stateFilter;
  const filteredEvents = useMemo(
    () =>
      getFestivalsForState(events, effectiveStateFilter)
        .filter((event) => festivalOverlapsRange(event, startDate, endDate))
        .filter((event) => categoryFilter === "all" || event.category === categoryFilter),
    [categoryFilter, effectiveStateFilter, endDate, events, startDate]
  );
  const visibleLimit = showFullCalendar ? filteredEvents.length : compact ? compactCalendarPreviewLimit : fullCalendarPreviewLimit;
  const visibleEvents = useMemo(() => filteredEvents.slice(0, visibleLimit), [filteredEvents, visibleLimit]);
  const visibleEventDetails = useMemo(() => {
    return new Map(
      visibleEvents.map((event) => {
        const matchedDestinations = getMatchedDestinations(event, destinationById);
        return [
          event.id,
          {
            matchedDestinations: matchedDestinations.slice(0, 3),
            planningSummary: getPlanningSummary(matchedDestinations),
          },
        ];
      })
    );
  }, [destinationById, visibleEvents]);
  const hiddenEventCount = filteredEvents.length - visibleEvents.length;
  const resultScope = effectiveStateFilter === "all" ? "Malaysia" : effectiveStateFilter;

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
            {filteredEvents.length} {t("tourist.events.upcomingSignals")} for {resultScope} {t("tourist.events.withinFilters")}.
          </p>
        </div>
        {!compact && (
          <div className="festival-filter-grid">
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
              <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as MalaysianState | "all")} disabled={nearMeOnly && Boolean(localState)}>
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
              <span>{localState ? t("tourist.events.nearMe") : t("tourist.events.nearMeUnavailable")}</span>
            </label>
          </div>
        )}
      </div>
      <div className="festival-list">
        {visibleEvents.map((event) => {
          const eventDetails = visibleEventDetails.get(event.id);
          const matchedDestinations = eventDetails?.matchedDestinations ?? [];
          const statesExpanded = expandedEventIds.includes(event.id);

          return (
            <article className={`festival-card festival-card-${event.category}`} key={event.id}>
              <div className="festival-date-rail">
                <CalendarDays size={17} />
                <strong>{formatEventDate(event, locale)}</strong>
                <span>{t(categoryLabelKey(event.category))}</span>
              </div>
              <div className="festival-card-main">
                <div className="festival-card-heading">
                  <h3>{event.name}</h3>
                </div>
                {event.venue && <small className="festival-venue">{event.venue}</small>}
                <p>{eventDescription(event, locale, t)}</p>
                <div className="festival-state-details">
                  <button type="button" onClick={() => toggleEventStates(event.id)} aria-expanded={statesExpanded}>
                    {formatFestivalStateSummaryLabel(event)}
                  </button>
                  {statesExpanded && (
                    <div>
                      <span>{formatFestivalScope(event)}</span>
                    </div>
                  )}
                </div>
                <div className="festival-insight-row">
                  <small className="festival-planning-note">{eventDetails?.planningSummary}</small>
                  {matchedDestinations.length > 0 && (
                    <div className="festival-destinations">
                      {matchedDestinations.map((destination) => (
                        <span key={destination.id}>
                          <DestinationVisual destination={destination} compact />
                          {destination.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
