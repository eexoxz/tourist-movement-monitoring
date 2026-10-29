import type { AppData, AttractionCheckIn, Destination, Itinerary, MovementPoint, TripItinerarySnapshot, TripSession } from "../types";
import { itineraryScheduleIssues, validItinerary, validPlanDate } from "./itineraries";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { getRecordedStopIds } from "./stopEvidence";

export function malaysiaDate(timestamp: number | string = Date.now()) {
  const time = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  const date = new Date(time + 8 * 3600000);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

export function snapshotItineraryDay(plan: Itinerary, userId: string, day: number, startedAt: string, reminders: boolean): TripItinerarySnapshot | null {
  if (!validItinerary(plan) || !plan.title.trim() || plan.userId !== userId || plan.deletedAt || plan.revision < 1 || itineraryScheduleIssues(plan).length || !Number.isInteger(day) || day < 1 || day > plan.days) return null;
  const stops = plan.stops.filter((stop) => stop.day === day).map((stop) => ({ ...stop }));
  const date = malaysiaDate(startedAt);
  return stops.length && date && validPlanDate(date) ? { planId: plan.id, revision: plan.revision, title: plan.title, day, date, reminders, stops } : null;
}

export function validTripItinerary(value: unknown): value is TripItinerarySnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as TripItinerarySnapshot;
  if (typeof item.date !== "string" || !item.date || !validPlanDate(item.date) || typeof item.reminders !== "boolean" || !Array.isArray(item.stops) || !item.stops.length || !Number.isInteger(item.day) || item.day < 1 || item.day > 14 || item.revision < 1) return false;
  const plan: Itinerary = { id: item.planId, userId: "snapshot-owner", title: item.title, startDate: item.date, days: item.day, notes: "", stops: item.stops, revision: item.revision, deletedAt: "", createdAt: `${item.date}T00:00:00Z`, updatedAt: `${item.date}T00:00:00Z` };
  return validItinerary(plan) && Boolean(plan.title.trim()) && item.stops.every((stop) => stop.day === item.day) && !itineraryScheduleIssues(plan).length;
}

export function setTripItineraryReminders(data: AppData, userId: string, tripId: string, reminders: boolean) {
  const trip = data.trips.find((item) => item.id === tripId && item.userId === userId && item.status === "active");
  if (!trip || !validTripItinerary(trip.itinerary)) return null;
  return { ...data, trips: data.trips.map((item) => item === trip ? { ...item, itinerary: { ...trip.itinerary!, reminders } } : item) };
}

export type PlannedVisitState = "planned" | "checkIn" | "gps" | "sample";
export function tripItineraryProgress(trip: TripSession, points: MovementPoint[], checkIns: AttractionCheckIn[], destinations: Destination[], now = Date.now()) {
  if (!validTripItinerary(trip.itinerary)) return null;
  const start = Date.parse(trip.startedAt), end = trip.endedAt ? Date.parse(trip.endedAt) : now;
  const inTrip = (timestamp: string) => { const time = Date.parse(timestamp); return Number.isFinite(time) && time >= start && time <= end; };
  const ownedPoints = points.filter((point) => point.tripId === trip.id && (!point.userId || point.userId === trip.userId) && inTrip(point.recordedAt));
  const index = createDestinationSpatialIndex(destinations);
  const gps = getRecordedStopIds(ownedPoints.filter((point) => point.source === "browser"), index);
  const samples = getRecordedStopIds(ownedPoints.filter((point) => point.source === "demo"), index);
  const checkedIn = new Set<string>();
  for (const visit of checkIns) {
    // QR check-ins on another device can lack a tripId; match those only inside this owner's trip interval.
    if (visit.userId !== trip.userId || !visit.destinationId || (visit.tripId && visit.tripId !== trip.id) || !inTrip(visit.checkedInAt)) continue;
    (visit.isDemo ? samples : checkedIn).add(visit.destinationId);
  }
  const recorded = new Set([...gps, ...checkedIn]);
  const planned = new Set(trip.itinerary.stops.map((stop) => stop.destinationId));
  const stops = trip.itinerary.stops.map((stop) => ({ ...stop, state: (checkedIn.has(stop.destinationId) ? "checkIn" : gps.has(stop.destinationId) ? "gps" : samples.has(stop.destinationId) ? "sample" : "planned") as PlannedVisitState }));
  return { snapshot: trip.itinerary, stops, visited: stops.filter((stop) => stop.state === "checkIn" || stop.state === "gps").length, otherIds: [...recorded].filter((id) => !planned.has(id)) };
}

export function dueItineraryStop(progress: NonNullable<ReturnType<typeof tripItineraryProgress>>, now: number, dismissed: ReadonlySet<string>) {
  if (!progress.snapshot.reminders) return undefined;
  return progress.stops.filter((stop) => {
    if (!stop.arrivalTime || dismissed.has(stop.id) || stop.state === "checkIn" || stop.state === "gps") return false;
    const due = Date.parse(`${progress.snapshot.date}T${stop.arrivalTime}:00+08:00`);
    return now >= due && now - due <= 10 * 60000;
  }).sort((a, b) => (b.arrivalTime ?? "").localeCompare(a.arrivalTime ?? ""))[0];
}
