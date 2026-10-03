import { discoveryAreas } from "../data/discoveryAreas";
import type { Destination, FestivalEvent, MovementPoint, User } from "../types";
import { distanceKm } from "./geo";
import { getFestivalTimeframe } from "./festivals";

export const discoveryRadiusKm = 25;

export function getLatestDiscoveryPoint(...points: (MovementPoint | undefined)[]) {
  return points.reduce<MovementPoint | undefined>((latest, point) => {
    if (!point || !Number.isFinite(Date.parse(point.recordedAt)) || Date.parse(point.recordedAt) > Date.now() + 60000) return latest;
    return !latest || Date.parse(point.recordedAt) > Date.parse(latest.recordedAt) ? point : latest;
  }, undefined);
}

export function getDiscoveryReference(user: User, gpsPoint?: MovementPoint): MovementPoint | undefined {
  if (user.discoveryLocationMode !== "area") {
    if (!gpsPoint) return undefined;
    const age = Date.now() - new Date(gpsPoint.recordedAt).getTime();
    return Number.isFinite(age) && age >= -60000 && age <= 5 * 60 * 1000 ? gpsPoint : undefined;
  }
  const area = discoveryAreas.find((candidate) => candidate.id === user.discoveryAreaId);
  return area ? {
    id: `browse-${area.id}`,
    tripId: "",
    latitude: area.latitude,
    longitude: area.longitude,
    accuracyMeters: 0,
    recordedAt: "",
    source: "demo",
  } : undefined;
}

export function getDiscoveryDestinations(destinations: Destination[], user: User, reference?: MovementPoint) {
  const hidden = new Set(user.hiddenDestinationIds ?? []);
  return destinations.filter((destination) => !hidden.has(destination.id) && (!reference || distanceKm(reference, destination) <= discoveryRadiusKm));
}

export function getLocalEventAnnouncement(events: FestivalEvent[], reference?: MovementPoint, now = new Date()) {
  if (!reference) {
    return null;
  }
  const area = discoveryAreas.reduce((nearest, candidate) => distanceKm(reference, candidate) < distanceKm(reference, nearest) ? candidate : nearest);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const until = today + 14 * 24 * 60 * 60 * 1000;
  return events.find((event) => {
    const { start, end } = getFestivalTimeframe(event);
    return end >= today && start <= until && (event.scope === "national" || event.states.includes(area.state));
  }) ?? null;
}
