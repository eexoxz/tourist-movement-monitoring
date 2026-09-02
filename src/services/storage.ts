import { initialData } from "../data/demoData";
import type {
  AnalysisResult,
  AppData,
  AttractionCheckIn,
  Destination,
  DestinationCategory,
  GeoFence,
  GeoFenceType,
  IncidentReport,
  KMeansFeatureVector,
  LocationConsent,
  MalaysianState,
  MovementPoint,
  Recommendation,
  SosAlert,
  TripSession,
  User,
} from "../types";
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
  sosAlerts: "sos_alerts",
  incidentReports: "incident_reports",
  checkIns: "attraction_checkins",
  geofences: "geofences",
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

export function cacheLocalData(data: AppData) {
  saveLocalData(data);
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
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return `${prefix}-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function publicUser(user: User) {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export function normalizeAppData(value: Partial<AppData> | null | undefined): AppData {
  const data = value ?? {};
  const destinations = Array.isArray(data.destinations) && data.destinations.length > 0 ? data.destinations : initialData.destinations;
  const geofences = Array.isArray(data.geofences) && data.geofences.length > 0 ? data.geofences : initialData.geofences;

  return {
    users: asArray<User>(data.users),
    consents: asArray<LocationConsent>(data.consents),
    trips: asArray<TripSession>(data.trips),
    points: asArray<MovementPoint>(data.points).map((point) => normalizeMovementPoint(point, data)),
    destinations: destinations.map(normalizeDestination),
    analyses: asArray<Partial<AnalysisResult>>(data.analyses).map(normalizeAnalysis),
    recommendations: asArray<Partial<Recommendation>>(data.recommendations).map(normalizeRecommendation),
    sosAlerts: asArray<Partial<SosAlert>>(data.sosAlerts).map(normalizeSosAlert),
    incidentReports: asArray<Partial<IncidentReport>>(data.incidentReports).map(normalizeIncidentReport),
    checkIns: asArray<Partial<AttractionCheckIn>>(data.checkIns).map(normalizeCheckIn),
    geofences: asArray<Partial<GeoFence>>(geofences).map(normalizeGeofence),
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

export async function loadCloudData(fallbackActor?: User | null) {
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
  const fallbackCurrentUser = fallbackActor && (fallbackActor.id === authUid || fallbackActor.authUid === authUid) ? fallbackActor : null;
  const isAdminUser = currentUserRecord?.role === "admin" || fallbackCurrentUser?.role === "admin";
  const readScopedCollection = isAdminUser ? readCollection : readOwnedCollection;
  const readScopedPreferredCollection = isAdminUser ? readPreferredCollection : readPreferredOwnedCollection;
  const userRows = isAdminUser ? readCollection<Omit<User, "password">>(FIRESTORE_COLLECTIONS.users) : Promise.resolve(currentUserRecord ? [currentUserRecord] : []);
  const profileRows = isAdminUser
    ? readCollection<TouristProfileDocument>(FIRESTORE_COLLECTIONS.touristProfiles)
    : readDocument<TouristProfileDocument>(FIRESTORE_COLLECTIONS.touristProfiles, authUid).then((profile) => (profile ? [profile] : []));
  const preferenceRows = isAdminUser
    ? readCollection<TouristPreferenceDocument>(FIRESTORE_COLLECTIONS.touristPreferences)
    : readDocument<TouristPreferenceDocument>(FIRESTORE_COLLECTIONS.touristPreferences, authUid).then((preference) => (preference ? [preference] : []));

  const [users, touristProfiles, touristPreferences, consents, trips, points, destinations, analyses, recommendations, sosAlerts, incidentReports, checkIns, geofences] = await Promise.all([
    userRows,
    profileRows,
    preferenceRows,
    readScopedPreferredCollection<LocationConsent>(FIRESTORE_COLLECTIONS.locationConsents, LEGACY_FIRESTORE_COLLECTIONS.consents),
    readScopedPreferredCollection<TripSession>(FIRESTORE_COLLECTIONS.tripSessions, LEGACY_FIRESTORE_COLLECTIONS.trips),
    readScopedPreferredCollection<MovementPoint>(FIRESTORE_COLLECTIONS.movementRecords, LEGACY_FIRESTORE_COLLECTIONS.movementPoints),
    readCollection<Destination>(FIRESTORE_COLLECTIONS.destinations),
    readScopedPreferredCollection<AnalysisResult>(FIRESTORE_COLLECTIONS.aiAnalyses, LEGACY_FIRESTORE_COLLECTIONS.analyses),
    readScopedCollection<Recommendation>(FIRESTORE_COLLECTIONS.recommendations),
    readScopedCollection<SosAlert>(FIRESTORE_COLLECTIONS.sosAlerts),
    readScopedCollection<IncidentReport>(FIRESTORE_COLLECTIONS.incidentReports),
    readScopedCollection<AttractionCheckIn>(FIRESTORE_COLLECTIONS.checkIns),
    readCollection<GeoFence>(FIRESTORE_COLLECTIONS.geofences),
  ]);

  const mergedUsers = mergeUserDocuments(users, touristProfiles, touristPreferences);
  const hasStructuredData =
    mergedUsers.length > 0 ||
    consents.length > 0 ||
    trips.length > 0 ||
    points.length > 0 ||
    destinations.length > 0 ||
    analyses.length > 0 ||
    recommendations.length > 0 ||
    sosAlerts.length > 0 ||
    incidentReports.length > 0 ||
    checkIns.length > 0 ||
    geofences.length > 0;

  if (hasStructuredData) {
    const data = normalizeAppData({
      users: mergedUsers,
      consents,
      trips,
      points,
      destinations,
      analyses,
      recommendations,
      sosAlerts,
      incidentReports,
      checkIns,
      geofences,
    });
    saveLocalData(data);
    return data;
  }

  const legacySnapshot = await getDoc(doc(services.db, LEGACY_DATA_COLLECTION, LEGACY_DATA_DOCUMENT));
  const data = normalizeAppData(legacySnapshot.exists() ? (legacySnapshot.data() as Partial<AppData>) : initialData);

  await saveCloudData(data, fallbackCurrentUser);
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
    const nextSosAlertIds = new Set(data.sosAlerts.filter((alert) => alert.userId === currentActor.id).map((alert) => alert.id));
    const nextIncidentReportIds = new Set(data.incidentReports.filter((report) => report.userId === currentActor.id).map((report) => report.id));
    const nextCheckInIds = new Set(data.checkIns.filter((checkIn) => checkIn.userId === currentActor.id).map((checkIn) => checkIn.id));

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
    for (const alert of data.sosAlerts.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.sosAlerts, alert.id), cleanFirestoreData(alert) as Record<string, unknown>));
    }
    for (const report of data.incidentReports.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) =>
        currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.incidentReports, report.id), cleanFirestoreData(report) as Record<string, unknown>)
      );
    }
    for (const checkIn of data.checkIns.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.checkIns, checkIn.id), cleanFirestoreData(checkIn) as Record<string, unknown>));
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
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.sosAlerts, nextSosAlertIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.incidentReports, nextIncidentReportIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.checkIns, nextCheckInIds);
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
    await syncCollection(FIRESTORE_COLLECTIONS.sosAlerts, data.sosAlerts, (alert) => alert.id);
    await syncCollection(FIRESTORE_COLLECTIONS.incidentReports, data.incidentReports, (report) => report.id);
    await syncCollection(FIRESTORE_COLLECTIONS.checkIns, data.checkIns, (checkIn) => checkIn.id);
    await syncCollection(FIRESTORE_COLLECTIONS.geofences, data.geofences, (geofence) => geofence.id);
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
    openingHours: destination.openingHours ?? fallback?.openingHours ?? "Check locally before visiting, especially during public holidays.",
    feeNote: destination.feeNote ?? fallback?.feeNote ?? "Fee information may vary; check the official counter or venue notice before entry.",
    visitTips: Array.isArray(destination.visitTips) ? destination.visitTips.filter(Boolean) : fallback?.visitTips ?? [],
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

function normalizeSafetyStatus(status: unknown) {
  return status === "reviewing" || status === "resolved" ? status : "open";
}

function normalizeSosAlert(alert: Partial<SosAlert>): SosAlert {
  const createdAt = alert.createdAt ?? new Date().toISOString();
  return {
    id: alert.id ?? createId("sos"),
    userId: alert.userId ?? "",
    status: normalizeSafetyStatus(alert.status),
    message: alert.message ?? "Tourist requested emergency assistance from the web app.",
    latitude: Number.isFinite(alert.latitude) ? alert.latitude : undefined,
    longitude: Number.isFinite(alert.longitude) ? alert.longitude : undefined,
    createdAt,
    updatedAt: alert.updatedAt ?? createdAt,
    resolvedAt: alert.resolvedAt,
  };
}

function normalizeIncidentType(type: unknown) {
  return type === "lost-item" || type === "accident" || type === "suspicious-activity" || type === "medical" || type === "other" ? type : "other";
}

function normalizeIncidentReport(report: Partial<IncidentReport>): IncidentReport {
  const createdAt = report.createdAt ?? new Date().toISOString();
  return {
    id: report.id ?? createId("incident"),
    userId: report.userId ?? "",
    type: normalizeIncidentType(report.type),
    status: normalizeSafetyStatus(report.status),
    description: report.description ?? "Older incident report restored from prototype data.",
    locationNote: report.locationNote,
    latitude: Number.isFinite(report.latitude) ? report.latitude : undefined,
    longitude: Number.isFinite(report.longitude) ? report.longitude : undefined,
    createdAt,
    updatedAt: report.updatedAt ?? createdAt,
  };
}

function normalizeCheckIn(checkIn: Partial<AttractionCheckIn>): AttractionCheckIn {
  const checkedInAt = checkIn.checkedInAt ?? new Date().toISOString();
  const status = checkIn.status === "checked-out" ? "checked-out" : "checked-in";

  return {
    id: checkIn.id ?? createId("checkin"),
    userId: checkIn.userId ?? "",
    destinationId: checkIn.destinationId ?? "",
    tripId: checkIn.tripId,
    status,
    checkedInAt,
    checkedOutAt: status === "checked-out" ? (checkIn.checkedOutAt ?? checkedInAt) : undefined,
    latitude: Number.isFinite(checkIn.latitude) ? checkIn.latitude : undefined,
    longitude: Number.isFinite(checkIn.longitude) ? checkIn.longitude : undefined,
  };
}

const malaysiaStateFallback: MalaysianState = "Federal Territories";

function normalizeGeofenceType(type: unknown): GeoFenceType {
  return type === "safe" || type === "restricted" || type === "dense" ? type : "dense";
}

function normalizeMalaysianState(state: unknown): MalaysianState {
  const states: MalaysianState[] = [
    "Johor",
    "Kedah",
    "Kelantan",
    "Melaka",
    "Negeri Sembilan",
    "Pahang",
    "Penang",
    "Perak",
    "Perlis",
    "Sabah",
    "Sarawak",
    "Selangor",
    "Terengganu",
    "Federal Territories",
  ];

  return states.includes(state as MalaysianState) ? (state as MalaysianState) : malaysiaStateFallback;
}

function normalizeGeofence(geofence: Partial<GeoFence>): GeoFence {
  return {
    id: geofence.id ?? createId("geofence"),
    name: geofence.name ?? "Tourist monitoring zone",
    type: normalizeGeofenceType(geofence.type),
    city: geofence.city ?? "Malaysia",
    state: normalizeMalaysianState(geofence.state),
    latitude: Number.isFinite(geofence.latitude) ? geofence.latitude! : 3.1556,
    longitude: Number.isFinite(geofence.longitude) ? geofence.longitude! : 101.7139,
    radiusMeters: Number.isFinite(geofence.radiusMeters) ? Math.max(100, geofence.radiusMeters!) : 600,
    message: geofence.message ?? "Tourist movement is being monitored in this area.",
    recommendedAction: geofence.recommendedAction ?? "Use normal travel care and follow local guidance.",
    destinationId: geofence.destinationId,
  };
}

function cleanFirestoreData<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}
