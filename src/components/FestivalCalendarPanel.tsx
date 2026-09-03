import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { allMalaysianStates } from "../data/festivals";
import type { Destination, FestivalEvent, MalaysianState } from "../types";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import {
  formatFestivalDate,
  formatFestivalScope,
  formatFestivalStateSummaryLabel,
  getFestivalDestinationMatches,
  getFestivalPlanningSummary,
  getFestivalsForState,
} from "../services/festivals";
import { EmptyState } from "./SummaryCards";

type FestivalCalendarPanelProps = {
  events: FestivalEvent[];
  destinations: Destination[];
  compact?: boolean;
  locale?: Locale;
  onOpenCalendar?: () => void;
};

export function FestivalCalendarPanel({ events, destinations, compact = false, locale = "en", onOpenCalendar }: FestivalCalendarPanelProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const [stateFilter, setStateFilter] = useState<MalaysianState | "all">("all");
  const [showFullCalendar, setShowFullCalendar] = useState(!compact);
  const [expandedEventIds, setExpandedEventIds] = useState<string[]>([]);
  const filteredEvents = getFestivalsForState(events, stateFilter);
  const visibleLimit = compact && !showFullCalendar ? 5 : filteredEvents.length;
  const visibleEvents = filteredEvents.slice(0, visibleLimit);
  const hiddenEventCount = filteredEvents.length - visibleEvents.length;
  const toggleEventStates = (eventId: string) => {
    setExpandedEventIds((currentIds) => (currentIds.includes(eventId) ? currentIds.filter((id) => id !== eventId) : [...currentIds, eventId]));
  };

  return (
    <section className={compact ? "festival-calendar compact" : "festival-calendar"}>
      <div className="section-heading">
        <div>
          <h2>{t("tourist.events.calendarTitle")}</h2>
          <p>
            {filteredEvents.length} {t("tourist.events.upcomingSignals")} for {stateFilter === "all" ? "Malaysia" : stateFilter} across the {t("tourist.events.next12Months").toLowerCase()}.
          </p>
        </div>
        <label className="festival-filter">
          {t("tourist.events.state")}
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as MalaysianState | "all")}>
            <option value="all">{t("tourist.events.allMalaysia")}</option>
            {allMalaysianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="festival-list">
        {visibleEvents.map((event) => {
          const matchedDestinations = getFestivalDestinationMatches(event, destinations).slice(0, 3);
          const statesExpanded = expandedEventIds.includes(event.id);

          return (
            <article className={`festival-card festival-card-${event.category}`} key={event.id}>
              <div className="festival-date-rail">
                <CalendarDays size={17} />
                <strong>{formatFestivalDate(event)}</strong>
                <span>{event.category}</span>
              </div>
              <div className="festival-card-main">
                <div className="festival-card-heading">
                  <h3>{event.name}</h3>
                </div>
                {event.venue && <small className="festival-venue">{event.venue}</small>}
                <p>{event.description}</p>
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
                  <small className="festival-planning-note">{getFestivalPlanningSummary(event, destinations)}</small>
                  {matchedDestinations.length > 0 && (
                    <div className="festival-destinations">
                      {matchedDestinations.map((destination) => (
                        <span key={destination.id}>{destination.name}</span>
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
          {t("tourist.events.showFull")} ({hiddenEventCount} more)
        </button>
      )}
      {compact && showFullCalendar && !onOpenCalendar && (
        <button className="festival-more-button secondary" type="button" onClick={() => setShowFullCalendar(false)}>
          {t("tourist.events.showFewer")}
        </button>
      )}
      {visibleEvents.length === 0 && <EmptyState text={t("tourist.events.noMatches")} />}
    </section>
  );
}
