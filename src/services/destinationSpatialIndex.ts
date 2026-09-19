import type { Destination, MovementPoint } from "../types";
import { distanceKm } from "./geo";

type GeoPoint = Pick<MovementPoint | Destination, "latitude" | "longitude">;

const kmPerLatitudeDegree = 111.32;

export type DestinationDistance = {
  destination: Destination;
  distance: number;
};

export type DestinationSpatialIndex = {
  destinations: Destination[];
  nearby(point: GeoPoint, radiusKm: number): DestinationDistance[];
  nearest(point: GeoPoint, maxDistanceKm?: number): DestinationDistance | undefined;
  candidatesBetween(previous: GeoPoint, current: GeoPoint, radiusKm: number): Destination[];
};

function gridKey(latitude: number, longitude: number, cellDegrees: number) {
  return `${Math.floor(latitude / cellDegrees)}:${Math.floor(longitude / cellDegrees)}`;
}

function longitudeRadiusDegrees(radiusKm: number, latitude: number) {
  return radiusKm / (kmPerLatitudeDegree * Math.max(0.25, Math.cos((latitude * Math.PI) / 180)));
}

function uniqueDestinationsFromCells(grid: Map<string, Destination[]>, cellBounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  const candidates = new Map<string, Destination>();

  for (let latCell = cellBounds.minLat; latCell <= cellBounds.maxLat; latCell += 1) {
    for (let lngCell = cellBounds.minLng; lngCell <= cellBounds.maxLng; lngCell += 1) {
      grid.get(`${latCell}:${lngCell}`)?.forEach((destination) => candidates.set(destination.id, destination));
    }
  }

  return [...candidates.values()];
}

export function createDestinationSpatialIndex(destinations: Destination[], cellDegrees = 0.15): DestinationSpatialIndex {
  const grid = new Map<string, Destination[]>();

  destinations.forEach((destination) => {
    const key = gridKey(destination.latitude, destination.longitude, cellDegrees);
    const current = grid.get(key);

    if (current) {
      current.push(destination);
      return;
    }

    grid.set(key, [destination]);
  });

  const candidatesNear = (point: GeoPoint, radiusKm: number) => {
    const latRadius = radiusKm / kmPerLatitudeDegree;
    const lngRadius = longitudeRadiusDegrees(radiusKm, point.latitude);

    return uniqueDestinationsFromCells(grid, {
      minLat: Math.floor((point.latitude - latRadius) / cellDegrees),
      maxLat: Math.floor((point.latitude + latRadius) / cellDegrees),
      minLng: Math.floor((point.longitude - lngRadius) / cellDegrees),
      maxLng: Math.floor((point.longitude + lngRadius) / cellDegrees),
    });
  };

  return {
    destinations,
    nearby(point, radiusKm) {
      return candidatesNear(point, radiusKm)
        .map((destination) => ({ destination, distance: distanceKm(point, destination) }))
        .filter((candidate) => candidate.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    },
    nearest(point, maxDistanceKm) {
      const candidates = maxDistanceKm ? candidatesNear(point, maxDistanceKm) : destinations;

      return candidates
        .map((destination) => ({ destination, distance: distanceKm(point, destination) }))
        .filter((candidate) => maxDistanceKm === undefined || candidate.distance <= maxDistanceKm)
        .sort((a, b) => a.distance - b.distance)[0];
    },
    candidatesBetween(previous, current, radiusKm) {
      const paddingDegrees = radiusKm / kmPerLatitudeDegree;

      return uniqueDestinationsFromCells(grid, {
        minLat: Math.floor((Math.min(previous.latitude, current.latitude) - paddingDegrees) / cellDegrees),
        maxLat: Math.floor((Math.max(previous.latitude, current.latitude) + paddingDegrees) / cellDegrees),
        minLng: Math.floor((Math.min(previous.longitude, current.longitude) - paddingDegrees) / cellDegrees),
        maxLng: Math.floor((Math.max(previous.longitude, current.longitude) + paddingDegrees) / cellDegrees),
      });
    },
  };
}
