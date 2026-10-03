import type { AppData, Destination, LocationConsent, MovementPoint, TouristProfile, TripSession, TripSummary, User } from "../types";
import { createId } from "./storage";
import { distanceKm } from "./geo";
import { createDestinationSpatialIndex } from "./destinationSpatialIndex";
import { compareTimeAsc, minutesBetween, timeValue } from "./time";
import { filterQualityMovementPoints, getMovementQualityIssue, isContinuousMovementSegment } from "./movementQuality";
import { discoveryRadiusKm } from "./discovery";
import { getRecordedStopIds } from "./stopEvidence";

type MovementInput = {
  tripId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  source: MovementPoint["source"];
  recordedAt?: string;
};

const sampleRouteDestinationIds: Record<TouristProfile, string[]> = {
  cultural: ["thean-hou-temple", "islamic-arts-museum", "merdeka-square", "kwai-chai-hong", "central-market", "batu-caves"],
  nature: ["perdana-botanical-garden", "klcc-park", "taman-botani-putrajaya", "sekinchan-paddy-gallery", "perdana-botanical-garden", "klcc-park"],
  urban: ["kampung-baru-kl", "klcc-park", "central-market", "kwai-chai-hong", "merdeka-square", "kampung-baru-kl"],
  mixed: ["islamic-arts-museum", "perdana-botanical-garden", "merdeka-square", "central-market", "kampung-baru-kl", "klcc-park"],
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

export function getVisitedDestinationIds(data: AppData, userId: string) {
  const tripIds = new Set(getUserTrips(data, userId).map((trip) => trip.id));
  const destinationIndex = createDestinationSpatialIndex(data.destinations);
  const visited = getRecordedStopIds(data.points.filter((point) => tripIds.has(point.tripId)), destinationIndex);
  data.checkIns.filter((checkIn) => checkIn.userId === userId).forEach((checkIn) => visited.add(checkIn.destinationId));

  return visited;
}

function getTripPoints(data: AppData, tripId: string) {
  return filterQualityMovementPoints(data.points.filter((point) => point.tripId === tripId)).sort((a, b) => compareTimeAsc(a.recordedAt, b.recordedAt));
}

export function summarizeTrip(data: AppData, tripId: string): TripSummary {
  const points = getTripPoints(data, tripId);
  const trip = data.trips.find((candidate) => candidate.id === tripId);
  let distance = 0;
  let accuracyTotal = 0;
  const destinationIndex = createDestinationSpatialIndex(data.destinations);
  const visitedDestinationIds = getRecordedStopIds(points, destinationIndex);
  data.checkIns.filter((checkIn) => checkIn.tripId === tripId && checkIn.userId === trip?.userId).forEach((checkIn) => visitedDestinationIds.add(checkIn.destinationId));

  points.forEach((point, index) => {
    accuracyTotal += point.accuracyMeters;
    if (index > 0 && isContinuousMovementSegment(points[index - 1], point)) {
      distance += distanceKm(points[index - 1], point);
    }

  });

  const startedAt = points[0]?.recordedAt ?? trip?.startedAt;
  const endedAt = points.at(-1)?.recordedAt ?? trip?.endedAt ?? startedAt;
  const durationMinutes = minutesBetween(startedAt, endedAt);
  const averageAccuracyMeters = points.length === 0 ? 0 : Math.round(accuracyTotal / points.length);

  return {
    tripId,
    pointCount: points.length,
    distanceKm: Number(distance.toFixed(2)),
    durationMinutes,
    visitedDestinationCount: visitedDestinationIds.size,
    averageAccuracyMeters,
    firstRecordedAt: points[0]?.recordedAt,
    lastRecordedAt: points.at(-1)?.recordedAt,
  };
}

export function summarizeUserTrips(data: AppData, userId: string) {
  return getUserTrips(data, userId).map((trip) => summarizeTrip(data, trip.id));
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

function inferSampleProfile(user: User): TouristProfile {
  if (user.expectedProfile) {
    return user.expectedProfile;
  }

  const preferences = user.travelPreferences ?? [];
  if (preferences.some((category) => category === "nature" || category === "coastal")) {
    return "nature";
  }

  if (preferences.some((category) => category === "urban" || category === "food")) {
    return "urban";
  }

  if (preferences.some((category) => category === "cultural" || category === "heritage")) {
    return "cultural";
  }

  return "mixed";
}

function samplePointTime(startedAt: Date, index: number) {
  return new Date(startedAt.getTime() + index * 18 * 60 * 1000).toISOString();
}

function simulatedPointNearDestination(destination: Destination, step: number) {
  const latitudeOffset = ((step % 5) - 2) * 0.00022;
  const longitudeOffset = (((step * 2) % 5) - 2) * 0.00022;

  return {
    latitude: Number((destination.latitude + latitudeOffset).toFixed(6)),
    longitude: Number((destination.longitude + longitudeOffset).toFixed(6)),
  };
}

function profileMatchesDestination(profile: TouristProfile, category: Destination["category"]) {
  if (profile === "mixed") {
    return true;
  }

  if (profile === "cultural") {
    return category === "cultural" || category === "heritage";
  }

  if (profile === "nature") {
    return category === "nature" || category === "coastal";
  }

  return category === "urban" || category === "food";
}

function getFallbackRouteDestinations(data: AppData, profile: TouristProfile) {
  return sampleRouteDestinationIds[profile]
    .map((destinationId) => data.destinations.find((destination) => destination.id === destinationId))
    .filter((destination): destination is NonNullable<typeof destination> => Boolean(destination));
}

export function getLocalSampleDestinations(
  data: AppData,
  profile: TouristProfile,
  referencePoint?: Pick<MovementPoint, "latitude" | "longitude">,
  limit = 6
) {
  const fallbackRoute = getFallbackRouteDestinations(data, profile);

  if (!referencePoint) {
    return fallbackRoute;
  }

  const destinationIndex = createDestinationSpatialIndex(data.destinations);
  const ranked = destinationIndex
    .nearby(referencePoint, discoveryRadiusKm)
    .map(({ destination, distance }) => ({
      destination,
      distance,
      profileMatch: profileMatchesDestination(profile, destination.category),
    }))
    .sort((a, b) => a.distance - b.distance || Number(b.profileMatch) - Number(a.profileMatch));
  const nearby = ranked.slice(0, limit).map((row) => row.destination);

  return nearby;
}

export function createSampleTripForUser(data: AppData, userId: string, referencePoint?: Pick<MovementPoint, "latitude" | "longitude">) {
  const user = data.users.find((candidate) => candidate.id === userId);
  if (!user) {
    return { error: "The current tourist account could not be found." };
  }

  const profile = inferSampleProfile(user);
  const routeDestinations = getLocalSampleDestinations(data, profile, referencePoint);

  if (routeDestinations.length < 2) {
    return { error: "Not enough saved destinations are available to create a sample route." };
  }

  const startedAt = new Date(Date.now() - 2.2 * 60 * 60 * 1000);
  const tripId = createId("trip");
  const trip: TripSession = {
    id: tripId,
    userId,
    status: "completed",
    startedAt: startedAt.toISOString(),
    endedAt: samplePointTime(startedAt, routeDestinations.length - 1),
    consentId: getGrantedConsent(data, userId)?.id ?? `sample-only-${userId}`,
  };
  const points: MovementPoint[] = routeDestinations.map((destination, index) => ({
    id: createId("point"),
    tripId,
    userId,
    latitude: destination.latitude,
    longitude: destination.longitude,
    accuracyMeters: 18 + (index % 5) * 4,
    recordedAt: samplePointTime(startedAt, index),
    source: "demo",
  }));

  return {
    tripId,
    pointCount: points.length,
    profile,
    data: {
      ...data,
      consents: data.consents,
      trips: [...data.trips, trip],
      points: [...data.points, ...points],
    },
  };
}

export function addLocalTestRouteToActiveTrip(data: AppData, userId: string, referencePoint?: Pick<MovementPoint, "latitude" | "longitude">, pointCount = 4) {
  const user = data.users.find((candidate) => candidate.id === userId);
  if (!user) {
    return { error: "The current tourist account could not be found." };
  }

  const activeTrip = getActiveTrip(data, userId);
  if (!activeTrip) {
    return { error: "Start a trip before adding a local test route." };
  }

  const currentPoints = getTripPoints(data, activeTrip.id);
  const anchor = currentPoints.at(-1) ?? referencePoint;
  const routeDestinations = getLocalSampleDestinations(data, inferSampleProfile(user), anchor, Math.max(2, pointCount)).slice(0, Math.max(2, pointCount));

  if (routeDestinations.length < 2) {
    return { error: "Not enough nearby destinations are available to simulate a local route." };
  }

  const baseTime = Math.max(Date.now(), timeValue(currentPoints.at(-1)?.recordedAt ?? activeTrip.startedAt));
  const points: MovementPoint[] = routeDestinations.map((destination, index) => {
    const point = simulatedPointNearDestination(destination, currentPoints.length + index);

    return {
      id: createId("point"),
      tripId: activeTrip.id,
      userId,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyMeters: 22 + (index % 4) * 5,
      recordedAt: new Date(baseTime + (index + 1) * 2 * 60 * 1000).toISOString(),
      source: "demo",
    };
  });

  return {
    pointCount: points.length,
    destinationNames: routeDestinations.map((destination) => destination.name),
    data: {
      ...data,
      points: [...data.points, ...points],
    },
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

  const previousPoint = data.points.reduce<MovementPoint | undefined>((latest, point) => {
    if (point.tripId !== trip.id) {
      return latest;
    }

    return !latest || timeValue(point.recordedAt) > timeValue(latest.recordedAt) ? point : latest;
  }, undefined);
  const candidate = {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters,
    source: input.source,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  };
  const previousBrowserPoint = input.source === "browser"
    ? data.points.filter((point) => point.tripId === trip.id && point.source === "browser").reduce<MovementPoint | undefined>((latest, point) => !latest || timeValue(point.recordedAt) > timeValue(latest.recordedAt) ? point : latest, undefined)
    : undefined;
  const qualityIssue = getMovementQualityIssue(candidate, previousBrowserPoint, Date.now(), true);
  if (qualityIssue) {
    return { error: "Waiting for a reliable location reading.", qualityIssue };
  }

  if (previousPoint) {
    const secondsApart = Math.abs(timeValue(candidate.recordedAt) - timeValue(previousPoint.recordedAt)) / 1000;
    if (distanceKm(previousPoint, candidate) < 0.04 && secondsApart < 60) {
      return { error: "Movement point is too close to the previous point and was not saved." };
    }
  }

  const point: MovementPoint = {
    id: createId("point"),
    tripId: input.tripId,
    userId: trip.userId,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: Math.max(1, input.accuracyMeters || 25),
    recordedAt: candidate.recordedAt,
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

export function updateTripLabel(data: AppData, userId: string, tripId: string, label: string) {
  const trip = data.trips.find((candidate) => candidate.id === tripId);
  if (!trip || trip.userId !== userId) {
    return { error: "This trip could not be found in your account." };
  }

  const normalizedLabel = label.trim().slice(0, 80);

  return {
    data: {
      ...data,
      trips: data.trips.map((candidate) => (candidate.id === tripId ? { ...candidate, label: normalizedLabel || undefined } : candidate)),
    },
  };
}

export function deleteTrip(data: AppData, userId: string, tripId: string) {
  const trip = data.trips.find((candidate) => candidate.id === tripId);
  if (!trip || trip.userId !== userId) {
    return { error: "This trip could not be found in your account." };
  }

  return {
    data: {
      ...data,
      trips: data.trips.filter((candidate) => candidate.id !== tripId),
      points: data.points.filter((point) => point.tripId !== tripId),
      analyses: data.analyses.filter((analysis) => analysis.tripId !== tripId),
      recommendations: data.recommendations.filter((recommendation) => recommendation.userId !== userId),
      checkIns: data.checkIns.filter((checkIn) => checkIn.tripId !== tripId),
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
