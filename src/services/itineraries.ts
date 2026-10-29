import type { Destination, Itinerary, ItineraryStop } from "../types";

export const itineraryLimits = { days: 14, stops: 40, title: 80, notes: 1000, stopNote: 300, minutes: 720 } as const;
export type ItineraryEntry = { plan: Itinerary; dirty: boolean };

export function validPlanDate(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validItinerary(value: unknown): value is Itinerary {
  if (!value || typeof value !== "object") return false;
  const plan = value as Itinerary;
  return typeof plan.id === "string" && /^itinerary-[\w-]+$/.test(plan.id) && typeof plan.userId === "string" && Boolean(plan.userId)
    && typeof plan.title === "string" && plan.title.length <= itineraryLimits.title
    && typeof plan.startDate === "string" && validPlanDate(plan.startDate)
    && Number.isInteger(plan.days) && plan.days >= 1 && plan.days <= itineraryLimits.days
    && Number.isSafeInteger(plan.revision) && plan.revision >= 0
    && typeof plan.deletedAt === "string" && (!plan.deletedAt || Number.isFinite(Date.parse(plan.deletedAt)))
    && typeof plan.notes === "string" && plan.notes.length <= itineraryLimits.notes
    && typeof plan.createdAt === "string" && Number.isFinite(Date.parse(plan.createdAt))
    && typeof plan.updatedAt === "string" && Number.isFinite(Date.parse(plan.updatedAt))
    && Array.isArray(plan.stops) && plan.stops.length <= itineraryLimits.stops
    && new Set(plan.stops.map((stop) => stop?.id)).size === plan.stops.length
    && new Set(plan.stops.map((stop) => `${stop?.day}:${stop?.destinationId}`)).size === plan.stops.length
    && plan.stops.every((stop) => stop && typeof stop.id === "string" && Boolean(stop.id)
      && typeof stop.destinationId === "string" && Boolean(stop.destinationId)
      && Number.isInteger(stop.day) && stop.day >= 1 && stop.day <= plan.days
      && Number.isInteger(stop.minutes) && stop.minutes >= 5 && stop.minutes <= itineraryLimits.minutes
      && (stop.arrivalTime === undefined || validItineraryTime(stop.arrivalTime))
      && (stop.departureTime === undefined || validItineraryTime(stop.departureTime))
      && typeof stop.note === "string" && stop.note.length <= itineraryLimits.stopNote);
}

export function createItinerary(userId: string, title: string, now = new Date().toISOString()): Itinerary {
  return { id: `itinerary-${crypto.randomUUID()}`, userId, title, startDate: "", days: 1, notes: "", stops: [], revision: 0, deletedAt: "", createdAt: now, updatedAt: now };
}

export function addItineraryStop(plan: Itinerary, place: Destination, day: number): Itinerary {
  if (plan.stops.length >= itineraryLimits.stops || plan.stops.some((stop) => stop.destinationId === place.id && stop.day === day) || !Number.isInteger(day) || day < 1 || day > plan.days) return plan;
  const minutes = Math.max(5, Math.min(itineraryLimits.minutes, Math.round(place.averageVisitMinutes) || 60));
  const stop: ItineraryStop = { id: crypto.randomUUID(), destinationId: place.id, day, minutes, note: "" };
  return { ...plan, stops: [...plan.stops, stop] };
}

export function moveItineraryStop(plan: Itinerary, id: string, direction: -1 | 1) {
  const index = plan.stops.findIndex((stop) => stop.id === id);
  if (index < 0) return plan;
  const peers = plan.stops.flatMap((stop, i) => stop.day === plan.stops[index].day ? [i] : []);
  const target = peers[peers.indexOf(index) + direction];
  if (target === undefined) return plan;
  const stops = [...plan.stops];
  [stops[index], stops[target]] = [stops[target], stops[index]];
  return { ...plan, stops };
}

export function sameItineraryContent(a: Itinerary, b: Itinerary) {
  return a.title === b.title && a.startDate === b.startDate && a.days === b.days && a.notes === b.notes && a.deletedAt === b.deletedAt && JSON.stringify(a.stops) === JSON.stringify(b.stops);
}

export function reconcileItineraries(entries: ItineraryEntry[], remote: Itinerary[]): ItineraryEntry[] {
  const remaining = new Map(entries.map((entry) => [entry.plan.id, entry]));
  const next: ItineraryEntry[] = remote.map((plan) => {
    const local = remaining.get(plan.id);
    remaining.delete(plan.id);
    return local?.dirty && !sameItineraryContent(local.plan, plan) ? local : { plan, dirty: false };
  });
  return [...next, ...Array.from(remaining.values()).filter((entry) => entry.dirty)].filter((entry) => !entry.plan.deletedAt).sort((a, b) => b.plan.updatedAt.localeCompare(a.plan.updatedAt));
}

export function itineraryDayDate(startDate: string, day: number) {
  if (!startDate || !validPlanDate(startDate)) return undefined;
  const date = new Date(`${startDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return date;
}

export function validItineraryTime(value: unknown): value is string {
  return typeof value === "string" && (value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
}
export type ItineraryScheduleIssue = { stopId: string; code: "incomplete" | "invalidRange" | "overlap" | "sequence" };
export function itineraryScheduleIssues(plan: Itinerary): ItineraryScheduleIssue[] {
  const issues: ItineraryScheduleIssue[] = [];
  for (let day = 1; day <= plan.days; day++) {
    const scheduled = plan.stops.filter((stop) => stop.day === day && (stop.arrivalTime || stop.departureTime));
    let previous: ItineraryStop | undefined;
    for (const stop of scheduled) {
      const start = stop.arrivalTime ?? "", end = stop.departureTime ?? "";
      if (!start || !end) { issues.push({ stopId: stop.id, code: "incomplete" }); continue; }
      if (!validItineraryTime(start) || !validItineraryTime(end) || end <= start) { issues.push({ stopId: stop.id, code: "invalidRange" }); continue; }
      if (previous && start < previous.arrivalTime!) issues.push({ stopId: stop.id, code: "sequence" });
      else if (previous && start < previous.departureTime!) issues.push({ stopId: stop.id, code: "overlap" });
      if (!previous || end > previous.departureTime!) previous = stop;
    }
  }
  return issues;
}
