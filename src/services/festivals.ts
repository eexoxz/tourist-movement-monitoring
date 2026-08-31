import { allMalaysianStates } from "../data/festivals";
import type { Destination, FestivalEvent, MalaysianState } from "../types";

const dateFormatter = new Intl.DateTimeFormat("en-MY", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatDateForCalendar(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEventDurationDays(event: FestivalEvent) {
  if (!event.endDate || event.endDate === event.date) {
    return 0;
  }

  return Math.round((startOfDay(new Date(`${event.endDate}T00:00:00`)) - startOfDay(new Date(`${event.date}T00:00:00`))) / (24 * 60 * 60 * 1000));
}

function moveRecurringEventToYear(event: FestivalEvent, year: number): FestivalEvent {
  const { month, day } = parseDateParts(event.date);
  const startDate = new Date(year, month - 1, day);
  const durationDays = getEventDurationDays(event);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + durationDays);
  const baseId = event.id.replace(/-\d{4}$/, "");

  return {
    ...event,
    id: `${baseId}-${year}`,
    date: formatDateForCalendar(startDate),
    endDate: event.endDate ? formatDateForCalendar(endDate) : undefined,
  };
}

function expandRollingEvents(events: FestivalEvent[], fromDate: Date, daysAhead: number) {
  const fromYear = fromDate.getFullYear();
  const until = new Date(startOfDay(fromDate) + daysAhead * 24 * 60 * 60 * 1000);
  const untilYear = until.getFullYear();
  const expandedEvents = new Map<string, FestivalEvent>();

  events.forEach((event) => {
    if (!event.recursAnnually) {
      expandedEvents.set(event.id, event);
      return;
    }

    for (let year = fromYear; year <= untilYear; year += 1) {
      const recurringEvent = moveRecurringEventToYear(event, year);
      expandedEvents.set(recurringEvent.id, recurringEvent);
    }
  });

  return Array.from(expandedEvents.values());
}

export function getFestivalTimeframe(event: FestivalEvent) {
  return {
    start: startOfDay(new Date(`${event.date}T00:00:00`)),
    end: startOfDay(new Date(`${event.endDate ?? event.date}T00:00:00`)),
  };
}

export function getUpcomingFestivals(events: FestivalEvent[], fromDate = new Date(), daysAhead = 365) {
  const from = startOfDay(fromDate);
  const until = from + daysAhead * 24 * 60 * 60 * 1000;

  return expandRollingEvents(events, fromDate, daysAhead)
    .filter((event) => {
      const { start, end } = getFestivalTimeframe(event);
      return end >= from && start <= until;
    })
    .sort((a, b) => getFestivalTimeframe(a).start - getFestivalTimeframe(b).start);
}

export function getFestivalsForState(events: FestivalEvent[], state: MalaysianState | "all") {
  if (state === "all") {
    return events;
  }

  return events.filter((event) => event.scope === "national" || event.states.includes(state));
}

export function formatFestivalScope(event: FestivalEvent) {
  if (event.scope === "national" || event.states.length >= allMalaysianStates.length) {
    return "Nationwide";
  }

  if (event.states.length >= 9) {
    const excludedStates = allMalaysianStates.filter((state) => !event.states.includes(state));
    return excludedStates.length > 0 ? `All states except ${excludedStates.join(", ")}` : "Nationwide";
  }

  return event.states.join(", ");
}

export function formatFestivalStateSummaryLabel(event: FestivalEvent) {
  if (event.scope === "national" || event.states.length >= allMalaysianStates.length) {
    return "Nationwide event";
  }

  if (event.states.length === 1) {
    return `Exclusive to ${event.states[0]}`;
  }

  return event.states.length >= 9 ? "Available in most states" : "Exclusive to selected states";
}

export function formatFestivalDate(event: FestivalEvent) {
  const start = dateFormatter.format(new Date(`${event.date}T00:00:00`));
  if (!event.endDate || event.endDate === event.date) {
    return start;
  }

  return `${start} to ${dateFormatter.format(new Date(`${event.endDate}T00:00:00`))}`;
}

export function getFestivalDestinationMatches(event: FestivalEvent, destinations: Destination[]) {
  const destinationIds = new Set(event.destinationIds);
  return destinations.filter((destination) => destinationIds.has(destination.id));
}

export function getFestivalPlanningSummary(event: FestivalEvent, destinations: Destination[]) {
  const matchedDestinations = getFestivalDestinationMatches(event, destinations);
  if (matchedDestinations.length === 0) {
    return "No linked place has been added yet. Use current movement demand to find suitable nearby destinations for this state.";
  }

  const cityNames = Array.from(new Set(matchedDestinations.map((destination) => destination.city)));
  return `These places may become busier around this event. Compare demand in ${cityNames.join(", ")} before planning a route.`;
}
