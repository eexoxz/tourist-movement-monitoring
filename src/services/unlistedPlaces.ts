import type { AppData, AttractionCheckIn, Destination, MovementPoint, PlaceReview, User } from "../types";
import { allMalaysianStates } from "../data/festivals";
import { destinationCategories } from "./destinationManagement";
import { getActiveCheckIn } from "./checkIns";
import { getMovementQualityIssue } from "./movementQuality";
import { distanceKm } from "./geo";
import { createId } from "./storage";

export type UnlistedPlaceDraft = Omit<NonNullable<AttractionCheckIn["submittedPlace"]>, "accuracyMeters">;
export type PlaceSubmissionError = "invalid" | "active" | "location" | "admin" | "missing";
export type PlaceSubmissionGroup = { id: string; reports: AttractionCheckIn[]; place: UnlistedPlaceDraft; latitude?: number; longitude?: number; touristCount: number };

export function createUnlistedCheckIn(data: AppData, userId: string, draft: UnlistedPlaceDraft, point?: MovementPoint) {
  if (!data.users.some((user) => user.id === userId && user.role === "tourist")) return { error: "invalid" as PlaceSubmissionError };
  if (getActiveCheckIn(data, userId)) return { error: "active" as PlaceSubmissionError };
  const place = { ...draft, name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim(), note: draft.note.trim() };
  if (place.name.length < 2 || place.name.length > 100 || place.address.length < 8 || place.address.length > 300 || place.city.length < 2 || place.city.length > 80 || place.note.length > 500 || !allMalaysianStates.includes(place.state) || !destinationCategories.includes(place.category)) return { error: "invalid" as PlaceSubmissionError };
  if (point && (!data.consents.some((consent) => consent.userId === userId && consent.granted) || point.source !== "browser" || getMovementQualityIssue(point, undefined, Date.now(), true) || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180)) return { error: "location" as PlaceSubmissionError };
  const checkIn: AttractionCheckIn = {
    id: createId("checkin"), userId, destinationId: "", status: "checked-in", checkedInAt: new Date().toISOString(),
    tripId: data.trips.find((trip) => trip.userId === userId && trip.status === "active")?.id,
    latitude: point?.latitude, longitude: point?.longitude,
    submittedPlace: { ...place, accuracyMeters: point?.accuracyMeters }, reviewStatus: "pending",
  };
  return { checkIn, data: { ...data, checkIns: [checkIn, ...data.checkIns] } };
}

const normalized = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export function selectPlaceReports(group: PlaceSubmissionGroup, excluded: ReadonlySet<string>): PlaceSubmissionGroup | undefined {
  const reports = group.reports.slice(0, 100).filter((report) => !excluded.has(report.id));
  if (!reports.length) return undefined;
  const gps = reports.find((report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude));
  return { ...group, reports, place: reports[0].submittedPlace!, latitude: gps?.latitude, longitude: gps?.longitude, touristCount: new Set(reports.map((report) => report.userId)).size };
}
export function groupUnlistedCheckIns(checkIns: AttractionCheckIn[]): PlaceSubmissionGroup[] {
  const buckets = new Map<string, PlaceSubmissionGroup[]>();
  for (const report of [...checkIns].sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt))) {
    if (!report.submittedPlace || report.reviewStatus === "linked" || report.reviewStatus === "dismissed") continue;
    const place = report.submittedPlace;
    const key = `${place.state}:${normalized(place.name)}`;
    const groups = buckets.get(key) ?? [];
    const hasGps = Number.isFinite(report.latitude) && Number.isFinite(report.longitude);
    const group = groups.find((candidate) => {
      if (hasGps && candidate.latitude !== undefined && candidate.longitude !== undefined) return distanceKm({ latitude: report.latitude!, longitude: report.longitude! }, { latitude: candidate.latitude, longitude: candidate.longitude }) <= 0.15;
      return normalized(place.address) === normalized(candidate.place.address) && normalized(place.city) === normalized(candidate.place.city);
    });
    if (group) {
      group.reports.push(report);
      if (group.latitude === undefined && hasGps) { group.latitude = report.latitude; group.longitude = report.longitude; }
    }
    else groups.push({ id: report.id, reports: [report], place, latitude: hasGps ? report.latitude : undefined, longitude: hasGps ? report.longitude : undefined, touristCount: 1 });
    buckets.set(key, groups);
  }
  return [...buckets.values()].flat().map((group) => ({ ...group, touristCount: new Set(group.reports.map((report) => report.userId)).size })).sort((a, b) => b.touristCount - a.touristCount || b.reports.length - a.reports.length);
}

export function reviewUnlistedCheckIns(data: AppData, actor: User, ids: string[], destinationId: string, destination?: Destination) {
  if (actor.role !== "admin") return { error: "admin" as PlaceSubmissionError };
  const selected = new Set(ids);
  if (!selected.size || selected.size > 100 || !ids.every((id) => data.checkIns.some((record) => record.id === id && record.submittedPlace && (!record.reviewStatus || record.reviewStatus === "pending")))) return { error: "missing" as PlaceSubmissionError };
  if (destinationId && !(destination?.id === destinationId || data.destinations.some((place) => place.id === destinationId))) return { error: "missing" as PlaceSubmissionError };
  if (destination && data.destinations.some((place) => place.id === destination.id)) return { error: "missing" as PlaceSubmissionError };
  const review: PlaceReview = { checkInIds: [...selected], destinationId, status: destinationId ? "linked" : "dismissed", reviewedBy: actor.id, reviewedAt: new Date().toISOString(), destination };
  return { review, data: applyPlaceReview(data, review) };
}

export function applyPlaceReview(data: AppData, review: PlaceReview): AppData {
  const ids = new Set(review.checkInIds);
  return { ...data,
    destinations: review.destination && !data.destinations.some((place) => place.id === review.destinationId) ? [...data.destinations, review.destination] : data.destinations,
    checkIns: data.checkIns.map((record) => ids.has(record.id) ? { ...record, destinationId: review.destinationId, reviewStatus: review.status, reviewedBy: review.reviewedBy, reviewedAt: review.reviewedAt } : record),
  };
}

export function preserveReviewedCheckIn(incoming: AttractionCheckIn, existing?: AttractionCheckIn): AttractionCheckIn {
  if (!existing) return incoming;
  if (incoming.userId !== existing.userId) throw new Error("Check-in ownership cannot change");
  if (existing.status === "checked-out") return existing;
  return { ...existing, status: incoming.status, checkedOutAt: incoming.status === "checked-out" ? incoming.checkedOutAt : existing.checkedOutAt };
}
