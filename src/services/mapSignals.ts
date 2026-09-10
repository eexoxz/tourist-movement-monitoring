import type { Destination, MovementPoint } from "../types";
import { distanceKm } from "./geo";

export type DestinationSignal = {
  nearbyPointCount: number;
  uniqueTouristCount: number;
  latestRecordedAt?: string;
  distanceFromActiveKm?: number;
  tier: "high" | "medium" | "emerging" | "low";
};

type MutableDestinationSignal = {
  nearbyPointCount: number;
  touristIds: Set<string>;
  latestRecordedAt?: string;
  latestRecordedTime: number;
};

const nearbyRadiusKm = 1.2;
const kmPerLatitudeDegree = 111.32;

export function emptyDestinationSignal(activePoint?: MovementPoint, destination?: Destination): DestinationSignal {
  return {
    nearbyPointCount: 0,
    uniqueTouristCount: 0,
    distanceFromActiveKm: activePoint && destination ? distanceKm(activePoint, destination) : undefined,
    tier: "low",
  };
}

function getTier(nearbyPointCount: number, uniqueTouristCount: number): DestinationSignal["tier"] {
  if (nearbyPointCount >= 12 || uniqueTouristCount >= 5) {
    return "high";
  }

  if (nearbyPointCount >= 6 || uniqueTouristCount >= 3) {
    return "medium";
  }

  if (nearbyPointCount >= 2 || uniqueTouristCount >= 1) {
    return "emerging";
  }

  return "low";
}

export function calculateDestinationSignals(destinations: Destination[], points: MovementPoint[], activePoint?: MovementPoint) {
  const mutableSignals = new Map<string, MutableDestinationSignal>(
    destinations.map((destination) => [
      destination.id,
      {
        nearbyPointCount: 0,
        touristIds: new Set<string>(),
        latestRecordedTime: 0,
      },
    ])
  );

  const indexedDestinations = destinations.map((destination) => {
    const latitudeRadius = nearbyRadiusKm / kmPerLatitudeDegree;
    const longitudeRadius = nearbyRadiusKm / (kmPerLatitudeDegree * Math.max(0.25, Math.cos((destination.latitude * Math.PI) / 180)));

    return {
      destination,
      latitudeRadius,
      longitudeRadius,
    };
  });

  points.forEach((point) => {
    indexedDestinations.forEach(({ destination, latitudeRadius, longitudeRadius }) => {
      if (Math.abs(point.latitude - destination.latitude) > latitudeRadius || Math.abs(point.longitude - destination.longitude) > longitudeRadius) {
        return;
      }

      if (distanceKm(point, destination) > nearbyRadiusKm) {
        return;
      }

      const signal = mutableSignals.get(destination.id);
      if (!signal) {
        return;
      }

      signal.nearbyPointCount += 1;
      signal.touristIds.add(point.userId || point.tripId);

      const recordedTime = new Date(point.recordedAt).getTime();
      if (recordedTime > signal.latestRecordedTime) {
        signal.latestRecordedTime = recordedTime;
        signal.latestRecordedAt = point.recordedAt;
      }
    });
  });

  return new Map(
    destinations.map((destination) => {
      const signal = mutableSignals.get(destination.id);
      const nearbyPointCount = signal?.nearbyPointCount ?? 0;
      const uniqueTouristCount = signal?.touristIds.size ?? 0;

      return [
        destination.id,
        {
          nearbyPointCount,
          uniqueTouristCount,
          latestRecordedAt: signal?.latestRecordedAt,
          distanceFromActiveKm: activePoint ? distanceKm(activePoint, destination) : undefined,
          tier: getTier(nearbyPointCount, uniqueTouristCount),
        },
      ];
    })
  );
}
