import type { AppData, AttractionCheckIn, Destination, MovementPoint, PlaceReview, User } from "../types";
import { allMalaysianStates } from "../data/festivals";
import { destinationCategories } from "./destinationManagement";
import { getActiveCheckIn } from "./checkIns";
import { getMovementQualityIssue } from "./movementQuality";
import { distanceKm } from "./geo";
import { createId } from "./storage";

export type UnlistedPlaceDraft = Omit<NonNullable<AttractionCheckIn["submittedPlace"]>, "accuracyMeters">;
export type PlaceSubmissionError = "invalid" | "active" | "location" | "admin" | "missing";
export type PlaceSubmissionGroup = { id: string; reports: AttractionCheckIn[]; place: UnlistedPlaceDraft; latitude?: number; longitude?: number; touristCount: number; isDemo?: boolean };

export function createUnlistedCheckIn(data: AppData, userId: string, draft: UnlistedPlaceDraft, point?: MovementPoint) {
  if (!data.users.some((user) => user.id === userId && user.role === "tourist")) return { error: "invalid" as PlaceSubmissionError };
  if (getActiveCheckIn(data, userId)) return { error: "active" as PlaceSubmissionError };
  const place = { ...draft, name: draft.name.trim(), address: draft.address.trim(), city: draft.city.trim(), note: draft.note.trim() };
  if (place.name.length < 2 || place.name.length > 100 || place.address.length > 300 || place.city.length > 80 || place.note.length > 500 || (place.state && !allMalaysianStates.includes(place.state)) || !destinationCategories.includes(place.category) || (!point && (place.address.length < 8 || place.city.length < 2 || !place.state))) return { error: "invalid" as PlaceSubmissionError };
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
  const groups: PlaceSubmissionGroup[] = [];
  const gpsBuckets = new Map<string, PlaceSubmissionGroup[]>();
  const addressBuckets = new Map<string, PlaceSubmissionGroup>();
  const cell = 0.002;
  const gpsKey = (lat: number, lng: number, sample: boolean) => `${sample}:${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;
  const pending = checkIns.filter((report) => report.submittedPlace && report.reviewStatus !== "linked" && report.reviewStatus !== "dismissed");
  for (const report of pending.sort((a, b) => a.checkedInAt.localeCompare(b.checkedInAt))) {
    const place = report.submittedPlace!;
    const sample = report.isDemo === true;
    const addressKey = place.address.trim() ? `${sample}:${place.state}:${normalized(place.name)}:${normalized(place.address)}:${normalized(place.city)}` : "";
    const hasGps = Number.isFinite(report.latitude) && Number.isFinite(report.longitude) && Math.abs(report.latitude!) <= 90 && Math.abs(report.longitude!) <= 180;
    let group: PlaceSubmissionGroup | undefined;
    if (hasGps) {
      const lat = Math.floor(report.latitude! / cell), lng = Math.floor(report.longitude! / cell);
      const padding = Math.ceil(0.1 / (111 * cell * Math.max(0.01, Math.cos(report.latitude! * Math.PI / 180))));
      const candidates = padding > 3 ? groups : Array.from({ length: 3 }, (_, row) => Array.from({ length: 2 * padding + 1 }, (_, column) => gpsBuckets.get(`${sample}:${lat + row - 1}:${lng + column - padding}`) ?? [])).flat(2);
      group = candidates.find((candidate) => Boolean(candidate.isDemo) === sample && candidate.latitude !== undefined && candidate.longitude !== undefined && distanceKm({ latitude: report.latitude!, longitude: report.longitude! }, { latitude: candidate.latitude, longitude: candidate.longitude }) <= 0.1);
    }
    const addressMatch = addressKey ? addressBuckets.get(addressKey) : undefined;
    if (!group && addressMatch && (!hasGps || addressMatch.latitude === undefined)) group = addressMatch;
    if (group) {
      group.reports.push(report);
    }
    else { group = { id: report.id, reports: [report], place, touristCount: 1, isDemo: sample || undefined }; groups.push(group); }
    if (group.latitude === undefined && hasGps) {
      group.latitude = report.latitude; group.longitude = report.longitude;
      const key = gpsKey(report.latitude!, report.longitude!, sample);
      gpsBuckets.set(key, [...(gpsBuckets.get(key) ?? []), group]);
    }
    if (addressKey && !addressBuckets.has(addressKey)) addressBuckets.set(addressKey, group);
  }
  return groups.map((group) => ({ ...group, touristCount: new Set(group.reports.map((report) => report.userId)).size })).sort((a, b) => Number(Boolean(a.isDemo)) - Number(Boolean(b.isDemo)) || b.touristCount - a.touristCount || b.reports.length - a.reports.length);
}

export function mergePlaceReviewRecords(current: AttractionCheckIn[], pending: AttractionCheckIn[], reviewed: AttractionCheckIn[] = []) {
  const records = new Map(current.filter((record) => record.isDemo || !record.submittedPlace || record.reviewStatus === "linked" || record.reviewStatus === "dismissed").map((record) => [record.id, record]));
  [...pending, ...reviewed].forEach((record) => records.set(record.id, record));
  const next = [...records.values()];
  return next.length === current.length && next.every((record, index) => JSON.stringify(record) === JSON.stringify(current[index])) ? current : next;
}

export function sampleUnlistedCheckIns(): AttractionCheckIn[] {
  return [0, 1, 2].map((index) => ({ id: `unlisted-review-demo-${index}`, userId: `unlisted-sample-visitor-${index % 2}`, destinationId: "", status: "checked-out", checkedInAt: new Date(Date.now() - (index + 1) * 3600000).toISOString(), checkedOutAt: new Date(Date.now() - index * 3600000).toISOString(), latitude: 5.401 + index * 0.0001, longitude: 100.279 + index * 0.0001, submittedPlace: { name: index === 1 ? "Sample nearby stop" : "Sample unlisted stop", address: "", city: "Air Itam", state: "Penang", category: "food", note: "Sample report only", accuracyMeters: 20 }, reviewStatus: "pending", isDemo: true }));
}

export function reviewUnlistedCheckIns(data: AppData, actor: User, ids: string[], destinationId: string, destination?: Destination) {
  if (actor.role !== "admin") return { error: "admin" as PlaceSubmissionError };
  const selected = new Set(ids);
  if (!selected.size || selected.size > 100 || !ids.every((id) => data.checkIns.some((record) => record.id === id && !record.isDemo && record.submittedPlace && (!record.reviewStatus || record.reviewStatus === "pending")))) return { error: "missing" as PlaceSubmissionError };
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
