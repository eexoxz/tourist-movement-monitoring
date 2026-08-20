import type { AppData, LocationConsent, MovementPoint, TripSession } from "../types";
import { createId } from "./storage";

type MovementInput = {
  tripId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: MovementPoint["source"];
};

export function getUserTrips(data: AppData, userId: string) {
  return data.trips.filter((trip) => trip.userId === userId);
}

export function getActiveTrip(data: AppData, userId: string) {
  return getUserTrips(data, userId).find((trip) => trip.status === "active") ?? null;
}

export function getGrantedConsent(data: AppData, userId: string) {
  return data.consents.find((consent) => consent.userId === userId && consent.granted) ?? null;
}

export function grantLocationConsent(data: AppData, userId: string) {
  const consent: LocationConsent = {
    id: createId("consent"),
    userId,
    granted: true,
    grantedAt: new Date().toISOString(),
  };

  return {
    ...data,
    consents: [...data.consents.filter((item) => item.userId !== userId), consent],
  };
}

export function startTripSession(data: AppData, userId: string) {
  const consent = getGrantedConsent(data, userId);
  if (!consent) {
    return { error: "Location consent is required before trip tracking starts." };
  }

  if (getActiveTrip(data, userId)) {
    return { error: "A trip is already being recorded." };
  }

  const trip: TripSession = {
    id: createId("trip"),
    userId,
    status: "active",
    startedAt: new Date().toISOString(),
    consentId: consent.id,
  };

  return {
    trip,
    data: {
      ...data,
      trips: [...data.trips, trip],
    },
  };
}

export function isValidCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function appendMovementPoint(data: AppData, input: MovementInput) {
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    return { error: "Enter a valid latitude and longitude before saving." };
  }

  const trip = data.trips.find((candidate) => candidate.id === input.tripId);
  if (!trip || trip.status !== "active") {
    return { error: "Start a trip before saving a movement point." };
  }

  const point: MovementPoint = {
    id: createId("point"),
    tripId: input.tripId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: Math.max(1, input.accuracyMeters || 25),
    recordedAt: new Date().toISOString(),
    source: input.source,
  };

  return {
    point,
    data: {
      ...data,
      points: [...data.points, point],
    },
  };
}

export function stopActiveTrip(data: AppData, userId: string) {
  const activeTrip = getActiveTrip(data, userId);
  if (!activeTrip) {
    return { error: "No active trip is being recorded." };
  }

  return {
    tripId: activeTrip.id,
    data: {
      ...data,
      trips: data.trips.map((trip) => (trip.id === activeTrip.id ? { ...trip, status: "completed" as const, endedAt: new Date().toISOString() } : trip)),
    },
  };
}

export function revokeLocationConsent(data: AppData, userId: string) {
  return {
    ...data,
    consents: data.consents.map((consent) =>
      consent.userId === userId && consent.granted ? { ...consent, granted: false, revokedAt: new Date().toISOString() } : consent
    ),
    trips: data.trips.map((trip) => (trip.userId === userId && trip.status === "active" ? { ...trip, status: "completed" as const, endedAt: new Date().toISOString() } : trip)),
  };
}

export function deleteTouristMovementData(data: AppData, userId: string) {
  const tripIds = new Set(getUserTrips(data, userId).map((trip) => trip.id));

  return {
    ...data,
    trips: data.trips.filter((trip) => trip.userId !== userId),
    points: data.points.filter((point) => !tripIds.has(point.tripId)),
    analyses: data.analyses.filter((analysis) => analysis.userId !== userId),
    recommendations: data.recommendations.filter((recommendation) => recommendation.userId !== userId),
  };
}
