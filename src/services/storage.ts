import { initialData } from "../data/demoData";
import type { AnalysisResult, AppData, Destination, DestinationCategory, KMeansFeatureVector, LocationConsent, MovementPoint, Recommendation, TripSession, User } from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";

const DATA_KEY = "tourist-movement-monitoring:data";
const SESSION_KEY = "tourist-movement-monitoring:session";
const LEGACY_DATA_COLLECTION = "prototype";
const LEGACY_DATA_DOCUMENT = "appData";

export const FIRESTORE_COLLECTIONS = {
  users: "users",
  touristProfiles: "tourist_profiles",
  touristPreferences: "tourist_preferences",
  locationConsents: "location_consents",
  tripSessions: "trip_sessions",
  movementRecords: "movement_records",
  destinationCategories: "destination_categories",
  destinations: "destinations",
  aiAnalyses: "ai_analyses",
  recommendations: "recommendations",
} as const;

const LEGACY_FIRESTORE_COLLECTIONS = {
  consents: "consents",
  trips: "trips",
  movementPoints: "movementPoints",
  analyses: "analyses",
} as const;

const FIRESTORE_BATCH_LIMIT = 450;

type TouristProfileDocument = Omit<User, "password"> & {
  userId: string;
  displayName: string;
};

type TouristPreferenceDocument = {
  id: string;
  userId: string;
  travelPreferences: DestinationCategory[];
  expectedProfile: User["expectedProfile"];
  tripPace: NonNullable<User["tripPace"]>;
  travelGroup: NonNullable<User["travelGroup"]>;
  accessibilityPreference: NonNullable<User["accessibilityPreference"]>;
  profileCompletedAt?: string;
  updatedAt: string;
};

type DestinationCategoryDocument = {
  id: DestinationCategory;
  label: string;
  destinationCount: number;
  updatedAt: string;
};

export function loadData(): AppData {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) {
    saveLocalData(initialData);
    return normalizeAppData(initialData);
  }

  try {
    const data = normalizeAppData(JSON.parse(raw) as Partial<AppData>);
    saveLocalData(data);
    return data;
  } catch {
    saveLocalData(initialData);
    return normalizeAppData(initialData);
  }
}

export function saveData(data: AppData, actor?: User | null) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  return saveCloudData(data, actor);
}

export function loadSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function saveSession(userId: string) {
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function publicUser(user: User) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function normalizeAppData(value: Partial<AppData> | null | undefined): AppData {
  const data = value ?? {};
  const destinations = Array.isArray(data.destinations) && data.destinations.length > 0 ? data.destinations : initialData.destinations;

  return {
    users: asArray<User>(data.users),
    consents: asArray<LocationConsent>(data.consents),
    trips: asArray<TripSession>(data.trips),
    points: asArray<MovementPoint>(data.points).map((point) => normalizeMovementPoint(point, data)),
    destinations: destinations.map(normalizeDestination),
    analyses: asArray<Partial<AnalysisResult>>(data.analyses).map(normalizeAnalysis),
    recommendations: asArray<Partial<Recommendation>>(data.recommendations).map(normalizeRecommendation),
  };
}

export function resetData() {
  saveLocalData(initialData);
  clearSession();
  return initialData;
}

export function getStorageMode() {
  return isFirebaseConfigured() ? "Firestore collections + local backup" : "Local browser storage";
}

export async function loadCloudData() {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  if (!services.auth.currentUser) {
    return null;
  }

  const { collection, doc, getDoc, getDocs, query, where } = await import("firebase/firestore");
  const authUid = services.auth.currentUser.uid;

  const readDocument = async <T>(name: string, id: string) => {
    try {
      const snapshot = await getDoc(doc(services.db, name, id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
    } catch {
      return null;
    }
  };

  const readCollection = async <T>(name: string) => {
    try {
      const snapshot = await getDocs(collection(services.db, name));
      return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
    } catch {
      return [];
    }
  };

  const readOwnedCollection = async <T>(name: string) => {
    try {
      const snapshot = await getDocs(query(collection(services.db, name), where("userId", "==", authUid)));
      return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
    } catch {
      return [];
    }
  };

  const readPreferredCollection = async <T>(preferredName: string, legacyName?: string) => {
    const preferredRows = await readCollection<T>(preferredName);
    if (preferredRows.length > 0 || !legacyName) {
      return preferredRows;
    }
    return readCollection<T>(legacyName);
  };

  const readPreferredOwnedCollection = async <T>(preferredName: string, legacyName?: string) => {
    const preferredRows = await readOwnedCollection<T>(preferredName);
    if (preferredRows.length > 0 || !legacyName) {
      return preferredRows;
    }
    return readOwnedCollection<T>(legacyName);
  };

  const currentUserRecord = await readDocument<Omit<User, "password">>(FIRESTORE_COLLECTIONS.users, authUid);
  const isAdminUser = currentUserRecord?.role === "admin";
  const readScopedCollection = isAdminUser ? readCollection : readOwnedCollection;
  const readScopedPreferredCollection = isAdminUser ? readPreferredCollection : readPreferredOwnedCollection;
  const userRows = isAdminUser ? readCollection<Omit<User, "password">>(FIRESTORE_COLLECTIONS.users) : Promise.resolve(currentUserRecord ? [currentUserRecord] : []);
  const profileRows = isAdminUser
    ? readCollection<TouristProfileDocument>(FIRESTORE_COLLECTIONS.touristProfiles)
    : readDocument<TouristProfileDocument>(FIRESTORE_COLLECTIONS.touristProfiles, authUid).then((profile) => (profile ? [profile] : []));
  const preferenceRows = isAdminUser
    ? readCollection<TouristPreferenceDocument>(FIRESTORE_COLLECTIONS.touristPreferences)
    : readDocument<TouristPreferenceDocument>(FIRESTORE_COLLECTIONS.touristPreferences, authUid).then((preference) => (preference ? [preference] : []));

  const [users, touristProfiles, touristPreferences, consents, trips, points, destinations, analyses, recommendations] = await Promise.all([
    userRows,
    profileRows,
    preferenceRows,
    readScopedPreferredCollection<LocationConsent>(FIRESTORE_COLLECTIONS.locationConsents, LEGACY_FIRESTORE_COLLECTIONS.consents),
    readScopedPreferredCollection<TripSession>(FIRESTORE_COLLECTIONS.tripSessions, LEGACY_FIRESTORE_COLLECTIONS.trips),
    readScopedPreferredCollection<MovementPoint>(FIRESTORE_COLLECTIONS.movementRecords, LEGACY_FIRESTORE_COLLECTIONS.movementPoints),
    readCollection<Destination>(FIRESTORE_COLLECTIONS.destinations),
    readScopedPreferredCollection<AnalysisResult>(FIRESTORE_COLLECTIONS.aiAnalyses, LEGACY_FIRESTORE_COLLECTIONS.analyses),
    readScopedCollection<Recommendation>(FIRESTORE_COLLECTIONS.recommendations),
  ]);

  const mergedUsers = mergeUserDocuments(users, touristProfiles, touristPreferences);
  const hasStructuredData =
    mergedUsers.length > 0 || consents.length > 0 || trips.length > 0 || points.length > 0 || destinations.length > 0 || analyses.length > 0 || recommendations.length > 0;

  if (hasStructuredData) {
    const data = normalizeAppData({
      users: mergedUsers,
      consents,
      trips,
      points,
      destinations,
      analyses,
      recommendations,
    });
    saveLocalData(data);
    return data;
  }

  const legacySnapshot = await getDoc(doc(services.db, LEGACY_DATA_COLLECTION, LEGACY_DATA_DOCUMENT));
  const data = normalizeAppData(legacySnapshot.exists() ? (legacySnapshot.data() as Partial<AppData>) : initialData);

  await saveCloudData(data);
  saveLocalData(data);
  return data;
}

export async function saveCloudData(data: AppData, actor?: User | null) {
  const services = getFirebaseServices();
  if (!services) {
    return false;
  }

  if (!services.auth.currentUser) {
    return false;
  }

  const { collection, doc, getDocs, query, where, writeBatch } = await import("firebase/firestore");
  const authUid = services.auth.currentUser.uid;
  const currentActor = actor ?? data.users.find((user) => user.authUid === authUid || user.id === authUid);

  if (!currentActor) {
    return false;
  }

  const actorId = currentActor.id;
  const db = services.db;
  type FirestoreWriteBatch = ReturnType<typeof writeBatch>;
  let batch = writeBatch(db);
  let batchWriteCount = 0;

  const queueWrite = async (write: (currentBatch: FirestoreWriteBatch) => void) => {
    write(batch);
    batchWriteCount += 1;

    if (batchWriteCount >= FIRESTORE_BATCH_LIMIT) {
      await batch.commit();
      batch = writeBatch(db);
      batchWriteCount = 0;
    }
  };

  const commitQueuedWrites = async () => {
    if (batchWriteCount > 0) {
      await batch.commit();
      batch = writeBatch(db);
      batchWriteCount = 0;
    }
  };

  const syncCollection = async <T>(name: string, rows: T[], getId: (row: T) => string) => {
    const existing = await getDocs(collection(db, name));
    const nextIds = new Set<string>();

    for (const row of rows) {
      const id = getId(row);
      if (!id) {
        continue;
      }
      nextIds.add(id);
      await queueWrite((currentBatch) => currentBatch.set(doc(db, name, id), cleanFirestoreData(row) as Record<string, unknown>));
    }

    for (const snapshot of existing.docs) {
      if (!nextIds.has(snapshot.id)) {
        await queueWrite((currentBatch) => currentBatch.delete(snapshot.ref));
      }
    }
  };

  if (currentActor?.role === "tourist") {
    const ownTripIds = new Set(data.trips.filter((trip) => trip.userId === currentActor.id).map((trip) => trip.id));
    const existingTrips = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.tripSessions), where("userId", "==", currentActor.id)));
    const nextConsentIds = new Set(data.consents.filter((consent) => consent.userId === currentActor.id).map((consent) => consent.id));
    const nextTripIds = new Set(data.trips.filter((trip) => trip.userId === currentActor.id).map((trip) => trip.id));
    const nextPointIds = new Set(data.points.filter((point) => point.userId === currentActor.id || ownTripIds.has(point.tripId)).map((point) => point.id));
    const nextAnalysisIds = new Set(data.analyses.filter((analysis) => analysis.userId === currentActor.id).map((analysis) => analysis.tripId));
    const nextRecommendationIds = new Set(data.recommendations.filter((recommendation) => recommendation.userId === currentActor.id).map((recommendation) => recommendation.id));

    await queueWrite((currentBatch) =>
      currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.users, currentActor.id), cleanFirestoreData(publicUser(currentActor)) as Record<string, unknown>)
    );
    await queueWrite((currentBatch) =>
      currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.touristProfiles, currentActor.id), cleanFirestoreData(buildTouristProfileDocument(currentActor)) as Record<string, unknown>)
    );
    await queueWrite((currentBatch) =>
      currentBatch.set(
        doc(db, FIRESTORE_COLLECTIONS.touristPreferences, currentActor.id),
        cleanFirestoreData(buildTouristPreferenceDocument(currentActor)) as Record<string, unknown>
      )
    );

    for (const consent of data.consents.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.locationConsents, consent.id), cleanFirestoreData(consent) as Record<string, unknown>));
    }
    for (const trip of data.trips.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.tripSessions, trip.id), cleanFirestoreData(trip) as Record<string, unknown>));
    }
    for (const point of data.points.filter((row) => row.userId === currentActor.id || ownTripIds.has(row.tripId))) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.movementRecords, point.id), cleanFirestoreData(point) as Record<string, unknown>));
    }
    for (const analysis of data.analyses.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.aiAnalyses, analysis.tripId), cleanFirestoreData(analysis) as Record<string, unknown>));
    }
    for (const recommendation of data.recommendations.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) =>
        currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.recommendations, recommendation.id), cleanFirestoreData(recommendation) as Record<string, unknown>)
      );
    }

    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.locationConsents, nextConsentIds);
    for (const snapshot of existingTrips.docs) {
      const trip = snapshot.data() as TripSession;
      if (trip.userId === currentActor.id && !nextTripIds.has(snapshot.id)) {
        await queueWrite((currentBatch) => currentBatch.delete(snapshot.ref));
      }
    }
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.movementRecords, nextPointIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.aiAnalyses, nextAnalysisIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.recommendations, nextRecommendationIds);
  } else {
    await syncCollection(FIRESTORE_COLLECTIONS.users, data.users.map(publicUser), (user) => user.id);
    await syncCollection(FIRESTORE_COLLECTIONS.touristProfiles, data.users.filter((user) => user.role === "tourist").map(buildTouristProfileDocument), (user) => user.id);
    await syncCollection(FIRESTORE_COLLECTIONS.touristPreferences, data.users.filter((user) => user.role === "tourist").map(buildTouristPreferenceDocument), (preference) => preference.id);
    await syncCollection(FIRESTORE_COLLECTIONS.locationConsents, data.consents, (consent) => consent.id);
    await syncCollection(FIRESTORE_COLLECTIONS.tripSessions, data.trips, (trip) => trip.id);
    await syncCollection(FIRESTORE_COLLECTIONS.movementRecords, data.points, (point) => point.id);
    await syncCollection(FIRESTORE_COLLECTIONS.destinationCategories, buildDestinationCategoryRows(data.destinations), (category) => category.id);
    await syncCollection(FIRESTORE_COLLECTIONS.destinations, data.destinations, (destination) => destination.id);
    await syncCollection(FIRESTORE_COLLECTIONS.aiAnalyses, data.analyses, (analysis) => analysis.tripId);
    await syncCollection(FIRESTORE_COLLECTIONS.recommendations, data.recommendations, (recommendation) => recommendation.id);
  }

  await commitQueuedWrites();
  return true;

  async function deleteMissingOwnedDocs(name: string, nextIds: Set<string>) {
    const existing = await getDocs(query(collection(db, name), where("userId", "==", actorId)));
    for (const snapshot of existing.docs) {
      if (!nextIds.has(snapshot.id)) {
        await queueWrite((currentBatch) => currentBatch.delete(snapshot.ref));
      }
    }
  }
}

function mergeUserDocuments(
  users: Array<Omit<User, "password">>,
  touristProfiles: TouristProfileDocument[],
  touristPreferences: TouristPreferenceDocument[]
): User[] {
  const usersById = new Map<string, User>();

  for (const user of users) {
    usersById.set(user.id, { ...user, password: "" });
  }

  for (const profile of touristProfiles) {
    const userId = profile.userId || profile.id;
    if (!userId) {
      continue;
    }
    const currentUser = usersById.get(userId);
    const { displayName, userId: _profileUserId, ...profileUser } = profile;
    usersById.set(userId, {
      ...currentUser,
      ...profileUser,
      id: userId,
      name: profile.name || displayName || currentUser?.name || "Tourist",
      email: profile.email || currentUser?.email || "",
      password: "",
      role: profile.role || currentUser?.role || "tourist",
      createdAt: profile.createdAt || currentUser?.createdAt || new Date().toISOString(),
    } as User);
  }

  for (const preference of touristPreferences) {
    const currentUser = usersById.get(preference.userId);
    if (!currentUser) {
      continue;
    }
    usersById.set(preference.userId, {
      ...currentUser,
      travelPreferences: preference.travelPreferences,
      expectedProfile: preference.expectedProfile,
      tripPace: preference.tripPace,
      travelGroup: preference.travelGroup,
      accessibilityPreference: preference.accessibilityPreference,
      profileCompletedAt: preference.profileCompletedAt,
    });
  }

  return Array.from(usersById.values());
}

function buildTouristProfileDocument(user: User): TouristProfileDocument {
  return {
    ...publicUser(user),
    userId: user.id,
    displayName: user.name,
  };
}

function buildTouristPreferenceDocument(user: User): TouristPreferenceDocument {
  return {
    id: user.id,
    userId: user.id,
    travelPreferences: user.travelPreferences ?? [],
    expectedProfile: user.expectedProfile ?? "mixed",
    tripPace: user.tripPace ?? "balanced",
    travelGroup: user.travelGroup ?? "solo",
    accessibilityPreference: user.accessibilityPreference ?? "none",
    profileCompletedAt: user.profileCompletedAt,
    updatedAt: new Date().toISOString(),
  };
}

function buildDestinationCategoryRows(destinations: Destination[]): DestinationCategoryDocument[] {
  const labels: Record<DestinationCategory, string> = {
    cultural: "Cultural",
    nature: "Nature",
    urban: "Urban",
    heritage: "Heritage",
    food: "Food",
    coastal: "Coastal",
  };
  const updatedAt = new Date().toISOString();

  return Object.entries(labels).map(([id, label]) => ({
    id: id as DestinationCategory,
    label,
    destinationCount: destinations.filter((destination) => destination.category === id).length,
    updatedAt,
  }));
}

function saveLocalData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeDestination(destination: Destination): Destination {
  const fallback = initialData.destinations.find((candidate) => candidate.id === destination.id);
  return {
    ...destination,
    averageVisitMinutes: Number.isFinite(destination.averageVisitMinutes) ? destination.averageVisitMinutes : fallback?.averageVisitMinutes ?? 60,
  };
}

function normalizeMovementPoint(point: MovementPoint, data: Partial<AppData>): MovementPoint {
  const trip = data.trips?.find((candidate) => candidate.id === point.tripId);
  return {
    ...point,
    userId: point.userId ?? trip?.userId,
  };
}

function normalizeAnalysis(analysis: Partial<AnalysisResult>): AnalysisResult {
  const clusterCentroid = {
    cultural: analysis.clusterCentroid?.cultural ?? 0,
    nature: analysis.clusterCentroid?.nature ?? 0,
    urban: analysis.clusterCentroid?.urban ?? 0,
    heritage: analysis.clusterCentroid?.heritage ?? 0,
    food: analysis.clusterCentroid?.food ?? 0,
    coastal: analysis.clusterCentroid?.coastal ?? 0,
  };
  const kMeansInput = normalizeKMeansFeatureVector(analysis.kMeansInput);
  const kMeansCentroid = normalizeKMeansFeatureVector(analysis.kMeansCentroid, {
    culturalProportion: clusterCentroid.cultural + clusterCentroid.heritage,
    natureProportion: clusterCentroid.nature + clusterCentroid.coastal,
    urbanProportion: clusterCentroid.urban + clusterCentroid.food,
    uniqueDestinations: 0,
  });

  return {
    tripId: analysis.tripId ?? "",
    userId: analysis.userId ?? "",
    cluster: analysis.cluster ?? 0,
    profile: analysis.profile ?? "mixed",
    classifier: "decision-tree",
    classificationConfidence: analysis.classificationConfidence ?? 0,
    decisionTreeDepth: analysis.decisionTreeDepth ?? 0,
    decisionRuleCount: analysis.decisionRuleCount ?? analysis.decisionPath?.length ?? 0,
    decisionPath: analysis.decisionPath ?? [],
    silhouetteScore: analysis.silhouetteScore ?? 0,
    clusterDistance: analysis.clusterDistance ?? 0,
    clusterLabel: analysis.clusterLabel ?? "Unlabelled movement cluster",
    kMeansInput,
    kMeansCentroid,
    clusterCentroid,
    categoryCounts: {
      cultural: analysis.categoryCounts?.cultural ?? 0,
      nature: analysis.categoryCounts?.nature ?? 0,
      urban: analysis.categoryCounts?.urban ?? 0,
      heritage: analysis.categoryCounts?.heritage ?? 0,
      food: analysis.categoryCounts?.food ?? 0,
      coastal: analysis.categoryCounts?.coastal ?? 0,
    },
    dataPointCount: analysis.dataPointCount ?? 0,
    method: "k-means",
    generatedAt: analysis.generatedAt ?? new Date().toISOString(),
  };
}

function normalizeKMeansFeatureVector(value?: Partial<KMeansFeatureVector>, fallback?: KMeansFeatureVector): KMeansFeatureVector {
  return {
    culturalProportion: value?.culturalProportion ?? fallback?.culturalProportion ?? 0,
    natureProportion: value?.natureProportion ?? fallback?.natureProportion ?? 0,
    urbanProportion: value?.urbanProportion ?? fallback?.urbanProportion ?? 0,
    uniqueDestinations: value?.uniqueDestinations ?? fallback?.uniqueDestinations ?? 0,
  };
}

function normalizeRecommendation(recommendation: Partial<Recommendation>): Recommendation {
  return {
    id: recommendation.id ?? createId("recommendation"),
    userId: recommendation.userId ?? "",
    destinationId: recommendation.destinationId ?? "",
    score: recommendation.score ?? 0,
    scoreBreakdown: {
      profileFit: recommendation.scoreBreakdown?.profileFit ?? 0,
      clusterPattern: recommendation.scoreBreakdown?.clusterPattern ?? 0,
      movementDemand: recommendation.scoreBreakdown?.movementDemand ?? 0,
      proximity: recommendation.scoreBreakdown?.proximity ?? 0,
      unvisited: recommendation.scoreBreakdown?.unvisited ?? 0,
    },
    reason: recommendation.reason ?? "Recommendation restored from older prototype data.",
    generatedAt: recommendation.generatedAt ?? new Date().toISOString(),
  };
}

function cleanFirestoreData<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}
