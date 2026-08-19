import type { Destination, MovementPoint } from "../types";

export function distanceKm(a: Pick<MovementPoint | Destination, "latitude" | "longitude">, b: Pick<MovementPoint | Destination, "latitude" | "longitude">) {
  const radiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const deltaLat = toRad(b.latitude - a.latitude);
  const deltaLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearestDestination(point: MovementPoint, destinations: Destination[]) {
  return destinations
    .map((destination) => ({
      destination,
      distance: distanceKm(point, destination),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
