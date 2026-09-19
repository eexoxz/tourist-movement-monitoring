import type { Destination, MovementPoint } from "../types";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";

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

  const destinationIndex = createDestinationSpatialIndex(destinations);

  points.forEach((point) => {
    destinationIndex.nearby(point, nearbyRadiusKm).forEach(({ destination }) => {
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
