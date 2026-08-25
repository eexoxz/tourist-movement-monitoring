import { destinations } from "./destinations";
import type { AppData, Destination, DestinationCategory, LocationConsent, MovementPoint, TouristProfile, TripSession, User } from "../types";

const now = new Date();
const GENERATED_TOURIST_COUNT = 128;
const GENERATED_TRIPS_PER_TOURIST = 2;
const GENERATED_POINTS_PER_TRIP = 5;
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

export const demoDatasetMetadata = {
  generatedTouristCount: GENERATED_TOURIST_COUNT,
  generatedTripsPerTourist: GENERATED_TRIPS_PER_TOURIST,
  generatedPointsPerTrip: GENERATED_POINTS_PER_TRIP,
  namedDemoAccountCount: 5,
} as const;

const baseUsers: User[] = [
  {
    id: "tourist-demo",
    name: "Demo Tourist",
    email: "tourist@example.com",
    password: "tourist123",
    role: "tourist",
    expectedProfile: "mixed",
    travelPreferences: ["cultural", "nature", "food"],
    tripPace: "balanced",
    travelGroup: "friends",
    accessibilityPreference: "none",
    profileCompletedAt: hoursAgo(120),
    createdAt: hoursAgo(120),
  },
  {
    id: "admin-demo",
    name: "Tourism Administrator",
    email: "admin@tourism.local",
    password: "admin123",
    role: "admin",
    createdAt: hoursAgo(120),
  },
  {
    id: "tourist-nature-demo",
    name: "Nature Demo Tourist",
    email: "nature@example.com",
    password: "nature123",
    role: "tourist",
    expectedProfile: "nature",
    travelPreferences: ["nature", "coastal"],
    tripPace: "relaxed",
    travelGroup: "solo",
    accessibilityPreference: "low-walking",
    profileCompletedAt: hoursAgo(96),
    createdAt: hoursAgo(96),
  },
  {
    id: "tourist-cultural-demo",
    name: "Culture Demo Tourist",
    email: "culture@example.com",
    password: "culture123",
    role: "tourist",
    expectedProfile: "cultural",
    travelPreferences: ["cultural", "heritage"],
    tripPace: "balanced",
    travelGroup: "couple",
    accessibilityPreference: "none",
    profileCompletedAt: hoursAgo(84),
    createdAt: hoursAgo(84),
  },
  {
    id: "tourist-urban-demo",
    name: "Urban Demo Tourist",
    email: "urban@example.com",
    password: "urban123",
    role: "tourist",
    expectedProfile: "urban",
    travelPreferences: ["urban", "food"],
    tripPace: "packed",
    travelGroup: "friends",
    accessibilityPreference: "none",
    profileCompletedAt: hoursAgo(72),
    createdAt: hoursAgo(72),
  },
  {
    id: "tourist-insufficient-demo",
    name: "Learning Demo Tourist",
    email: "learning@example.com",
    password: "learning123",
    role: "tourist",
    expectedProfile: "mixed",
    travelPreferences: ["cultural", "nature", "urban"],
    tripPace: "balanced",
    travelGroup: "solo",
    accessibilityPreference: "none",
    profileCompletedAt: hoursAgo(66),
    createdAt: hoursAgo(66),
  },
];

const baseConsents: LocationConsent[] = [
  { id: "consent-demo", userId: "tourist-demo", granted: true, grantedAt: hoursAgo(5) },
  { id: "consent-nature-demo", userId: "tourist-nature-demo", granted: true, grantedAt: hoursAgo(28) },
  { id: "consent-cultural-demo", userId: "tourist-cultural-demo", granted: true, grantedAt: hoursAgo(56) },
  { id: "consent-urban-demo", userId: "tourist-urban-demo", granted: true, grantedAt: hoursAgo(12) },
  { id: "consent-insufficient-demo", userId: "tourist-insufficient-demo", granted: true, grantedAt: hoursAgo(6) },
];

const baseTrips: TripSession[] = [
  { id: "trip-demo-1", userId: "tourist-demo", status: "completed", startedAt: hoursAgo(5), endedAt: hoursAgo(3), consentId: "consent-demo" },
  { id: "trip-demo-2", userId: "tourist-nature-demo", status: "completed", startedAt: hoursAgo(28), endedAt: hoursAgo(25), consentId: "consent-nature-demo" },
  { id: "trip-cultural-demo", userId: "tourist-cultural-demo", status: "completed", startedAt: hoursAgo(56), endedAt: hoursAgo(53), consentId: "consent-cultural-demo" },
  { id: "trip-urban-demo", userId: "tourist-urban-demo", status: "completed", startedAt: hoursAgo(12), endedAt: hoursAgo(9), consentId: "consent-urban-demo" },
  { id: "trip-insufficient-demo", userId: "tourist-insufficient-demo", status: "completed", startedAt: hoursAgo(6), endedAt: hoursAgo(5.7), consentId: "consent-insufficient-demo" },
];

const basePoints: MovementPoint[] = [
  { id: "point-demo-1", tripId: "trip-demo-1", userId: "tourist-demo", latitude: 3.142, longitude: 101.6894, accuracyMeters: 35, recordedAt: hoursAgo(5), source: "demo" },
  { id: "point-demo-2", tripId: "trip-demo-1", userId: "tourist-demo", latitude: 3.1457, longitude: 101.6954, accuracyMeters: 28, recordedAt: hoursAgo(4.4), source: "demo" },
  { id: "point-demo-3", tripId: "trip-demo-1", userId: "tourist-demo", latitude: 3.1478, longitude: 101.6937, accuracyMeters: 24, recordedAt: hoursAgo(3.9), source: "demo" },
  { id: "point-demo-4", tripId: "trip-demo-1", userId: "tourist-demo", latitude: 3.1556, longitude: 101.7139, accuracyMeters: 30, recordedAt: hoursAgo(3.2), source: "demo" },
  { id: "point-nature-1", tripId: "trip-demo-2", userId: "tourist-nature-demo", latitude: 5.4242, longitude: 100.2697, accuracyMeters: 34, recordedAt: hoursAgo(28), source: "demo" },
  { id: "point-nature-2", tripId: "trip-demo-2", userId: "tourist-nature-demo", latitude: 5.4141, longitude: 100.3288, accuracyMeters: 38, recordedAt: hoursAgo(27.2), source: "demo" },
  { id: "point-nature-3", tripId: "trip-demo-2", userId: "tourist-nature-demo", latitude: 5.9487, longitude: 116.0474, accuracyMeters: 42, recordedAt: hoursAgo(25.4), source: "demo" },
  { id: "point-cultural-1", tripId: "trip-cultural-demo", userId: "tourist-cultural-demo", latitude: 3.2379, longitude: 101.684, accuracyMeters: 36, recordedAt: hoursAgo(56), source: "demo" },
  { id: "point-cultural-2", tripId: "trip-cultural-demo", userId: "tourist-cultural-demo", latitude: 3.142, longitude: 101.6894, accuracyMeters: 32, recordedAt: hoursAgo(55.1), source: "demo" },
  { id: "point-cultural-3", tripId: "trip-cultural-demo", userId: "tourist-cultural-demo", latitude: 3.1478, longitude: 101.6937, accuracyMeters: 27, recordedAt: hoursAgo(54.2), source: "demo" },
  { id: "point-cultural-4", tripId: "trip-cultural-demo", userId: "tourist-cultural-demo", latitude: 3.1457, longitude: 101.6954, accuracyMeters: 31, recordedAt: hoursAgo(53.4), source: "demo" },
  { id: "point-urban-1", tripId: "trip-urban-demo", userId: "tourist-urban-demo", latitude: 3.1556, longitude: 101.7139, accuracyMeters: 28, recordedAt: hoursAgo(12), source: "demo" },
  { id: "point-urban-2", tripId: "trip-urban-demo", userId: "tourist-urban-demo", latitude: 3.1579, longitude: 101.7116, accuracyMeters: 30, recordedAt: hoursAgo(11.2), source: "demo" },
  { id: "point-urban-3", tripId: "trip-urban-demo", userId: "tourist-urban-demo", latitude: 3.1457, longitude: 101.6954, accuracyMeters: 26, recordedAt: hoursAgo(10.1), source: "demo" },
  { id: "point-urban-4", tripId: "trip-urban-demo", userId: "tourist-urban-demo", latitude: 2.196, longitude: 102.2477, accuracyMeters: 40, recordedAt: hoursAgo(9.3), source: "demo" },
  { id: "point-insufficient-1", tripId: "trip-insufficient-demo", userId: "tourist-insufficient-demo", latitude: 3.1478, longitude: 101.6937, accuracyMeters: 35, recordedAt: hoursAgo(5.9), source: "demo" },
];

const travelPreferencesByProfile: Record<TouristProfile, DestinationCategory[]> = {
  cultural: ["cultural", "heritage"],
  nature: ["nature", "coastal"],
  urban: ["urban", "food"],
  mixed: ["cultural", "nature", "urban"],
};

const routesByProfile: Record<TouristProfile, string[][]> = {
  cultural: [
    ["batu-caves", "thean-hou-temple", "islamic-arts-museum", "kwai-chai-hong", "merdeka-square"],
    ["kek-lok-si-temple", "george-town-heritage-zone", "hin-bus-depot", "jonker-street", "concubine-lane"],
    ["mari-mari-cultural-village", "sarawak-cultural-village", "islamic-arts-museum", "thean-hou-temple", "kwai-chai-hong"],
  ],
  nature: [
    ["perdana-botanical-garden", "taman-botani-putrajaya", "sekinchan-paddy-gallery", "perdana-botanical-garden", "klcc-park"],
    ["penang-hill", "kek-lok-si-temple", "tanjung-aru", "mari-mari-cultural-village", "penang-hill"],
    ["semenggoh-nature-reserve", "sarawak-cultural-village", "tanjung-aru", "sekinchan-paddy-gallery", "taman-botani-putrajaya"],
  ],
  urban: [
    ["klcc-park", "kampung-baru-kl", "central-market", "kwai-chai-hong", "hin-bus-depot"],
    ["central-market", "klcc-park", "kampung-baru-kl", "jonker-street", "concubine-lane"],
    ["hin-bus-depot", "george-town-heritage-zone", "central-market", "klcc-park", "kampung-baru-kl"],
  ],
  mixed: [
    ["merdeka-square", "perdana-botanical-garden", "klcc-park", "kampung-baru-kl", "islamic-arts-museum"],
    ["george-town-heritage-zone", "penang-hill", "hin-bus-depot", "kek-lok-si-temple", "central-market"],
    ["kellies-castle", "concubine-lane", "sekinchan-paddy-gallery", "taman-botani-putrajaya", "thean-hou-temple"],
  ],
};

function destinationById(destinationId: string): Destination {
  const destination = destinations.find((candidate) => candidate.id === destinationId);

  if (!destination) {
    throw new Error(`Missing seed destination ${destinationId}`);
  }

  return destination;
}

function coordinateJitter(userIndex: number, tripIndex: number, pointIndex: number) {
  const seed = (userIndex + 1) * 37 + (tripIndex + 1) * 17 + (pointIndex + 1) * 11;
  const latitudeOffset = ((seed % 9) - 4) * 0.00024;
  const longitudeOffset = (((seed * 3) % 9) - 4) * 0.00024;

  return { latitudeOffset, longitudeOffset };
}

function createGeneratedSeedData() {
  const profiles: TouristProfile[] = ["cultural", "nature", "urban", "mixed"];
  const travelGroups: Array<NonNullable<User["travelGroup"]>> = ["solo", "couple", "family", "friends"];
  const tripPaces: Array<NonNullable<User["tripPace"]>> = ["relaxed", "balanced", "packed"];
  const users: User[] = [];
  const consents: LocationConsent[] = [];
  const trips: TripSession[] = [];
  const points: MovementPoint[] = [];

  for (let userIndex = 0; userIndex < GENERATED_TOURIST_COUNT; userIndex += 1) {
    const sequence = String(userIndex + 1).padStart(3, "0");
    const profile = profiles[userIndex % profiles.length];
    const userId = `tourist-seed-${sequence}`;
    const consentId = `consent-seed-${sequence}`;
    const createdHoursAgo = 120 + (userIndex % 18) * 18 + Math.floor(userIndex / 18) * 3;

    users.push({
      id: userId,
      name: `Demo Tourist ${sequence}`,
      email: `demo.tourist.${sequence}@example.com`,
      password: "demo1234",
      role: "tourist",
      expectedProfile: profile,
      travelPreferences: travelPreferencesByProfile[profile],
      tripPace: tripPaces[userIndex % tripPaces.length],
      travelGroup: travelGroups[userIndex % travelGroups.length],
      accessibilityPreference: userIndex % 9 === 0 ? "low-walking" : "none",
      profileCompletedAt: hoursAgo(createdHoursAgo - 2),
      createdAt: hoursAgo(createdHoursAgo),
    });

    consents.push({
      id: consentId,
      userId,
      granted: true,
      grantedAt: hoursAgo(createdHoursAgo - 3),
    });

    for (let tripIndex = 0; tripIndex < GENERATED_TRIPS_PER_TOURIST; tripIndex += 1) {
      const tripId = `trip-seed-${sequence}-${tripIndex + 1}`;
      const startedHoursAgo = Math.max(4, createdHoursAgo - 18 - tripIndex * 36);
      const routeOptions = routesByProfile[profile];
      const route = routeOptions[(userIndex + tripIndex) % routeOptions.length];

      trips.push({
        id: tripId,
        userId,
        status: "completed",
        startedAt: hoursAgo(startedHoursAgo),
        endedAt: hoursAgo(startedHoursAgo - 2.4),
        consentId,
      });

      for (let pointIndex = 0; pointIndex < GENERATED_POINTS_PER_TRIP; pointIndex += 1) {
        const destination = destinationById(route[pointIndex % route.length]);
        const { latitudeOffset, longitudeOffset } = coordinateJitter(userIndex, tripIndex, pointIndex);

        points.push({
          id: `point-seed-${sequence}-${tripIndex + 1}-${pointIndex + 1}`,
          tripId,
          userId,
          latitude: Number((destination.latitude + latitudeOffset).toFixed(6)),
          longitude: Number((destination.longitude + longitudeOffset).toFixed(6)),
          accuracyMeters: 18 + ((userIndex + tripIndex + pointIndex) % 28),
          recordedAt: hoursAgo(startedHoursAgo - pointIndex * 0.42),
          source: "demo",
        });
      }
    }
  }

  return { users, consents, trips, points };
}

const generatedSeedData = createGeneratedSeedData();

export const initialData: AppData = {
  users: [...baseUsers, ...generatedSeedData.users],
  consents: [...baseConsents, ...generatedSeedData.consents],
  trips: [...baseTrips, ...generatedSeedData.trips],
  points: [...basePoints, ...generatedSeedData.points],
  destinations,
  analyses: [],
  recommendations: [],
};
