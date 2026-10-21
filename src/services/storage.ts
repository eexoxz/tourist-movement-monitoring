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
  PlaceReview,
  Recommendation,
  SosAlert,
  TripSession,
  User,
} from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";
import { preferredSosAlert } from "./safety";
import { preserveReviewedCheckIn } from "./unlistedPlaces";
import { acknowledgePendingCheckIns, loadPendingCheckIns } from "./pendingCheckIns";
import { mergeCheckInRecords } from "./checkInSync";
import { acknowledgeCloudJob, buildCloudChanges, queueCloudChanges, type CloudTables } from "./cloudChanges";
import { flushCloudChanges } from "./cloudSync";

const DATA_KEY = "tourist-movement-monitoring:data";
const SESSION_KEY = "tourist-movement-monitoring:session";
const demoUserIds = new Set(initialData.users.map((user) => user.id));
let localDataCache: { storage: Storage; raw: string; data: AppData } | undefined;
let privateCacheCleared = false;

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
  trackingSuggestionMode?: User["trackingSuggestionMode"];
  trackingSuggestionRadiusKm?: number;
  discoveryLocationMode?: User["discoveryLocationMode"];
  discoveryAreaId?: string;
  hiddenDestinationIds?: string[];
  eventAnnouncementsEnabled?: boolean;
  sampleActivityEnabled?: boolean;
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
  if (localDataCache?.storage === localStorage && localDataCache.raw === raw) return localDataCache.data;
  if (!raw) {
    const data = normalizeAppData(privateCacheCleared ? {} : initialData);
    saveLocalData(data);
    return data;
  }

  try {
    const data = normalizeAppData(JSON.parse(raw) as Partial<AppData>);
    saveLocalData(data);
    return data;
  } catch {
    const data = normalizeAppData(initialData);
    saveLocalData(data);
    return data;
  }
}

export function saveData(data: AppData, actor?: User | null, previousData = loadData()) {
  saveLocalData(data);
  return saveCloudData(data, actor, previousData);
}

export function cacheLocalData(data: AppData) {
  saveLocalData(data);
}

export function clearLocalDownloadCache() {
  localStorage.removeItem(DATA_KEY);
  privateCacheCleared = true;
  localDataCache = undefined;
}

export async function loadSharedDestinations(): Promise<Destination[] | null> {
  const services = getFirebaseServices();
  if (!services?.auth.currentUser) return null;
  const { collection, getDocsFromServer } = await import("firebase/firestore");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const snapshot = await Promise.race([
      getDocsFromServer(collection(services.db, FIRESTORE_COLLECTIONS.destinations)),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Place refresh timed out")), 10000); }),
    ]);
    return snapshot.docs.map((document) => normalizeDestination({ ...document.data(), id: document.id } as Destination));
  } finally {
    clearTimeout(timeout);
  }
}

export async function saveCheckInRecord(checkIn: AttractionCheckIn, actor?: User | null) {
  const services = getFirebaseServices();
  if (!services || !services.auth.currentUser || !actor || checkIn.isDemo) {
    return false;
  }

  const authUid = services.auth.currentUser.uid;
  const actorMatchesAuth = actor.id === authUid || actor.authUid === authUid;
  const actorCanWriteCheckIn = actor.role === "admin" || (actor.role === "tourist" && actor.id === checkIn.userId);
  if (!actorMatchesAuth || !actorCanWriteCheckIn) {
    return false;
  }

  const { doc, runTransaction } = await import("firebase/firestore");
  const reference = doc(services.db, FIRESTORE_COLLECTIONS.checkIns, checkIn.id);
  await runTransaction(services.db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const existing = snapshot.exists() ? normalizeCheckIn({ ...snapshot.data(), id: snapshot.id }) : undefined;
    const next = preserveReviewedCheckIn(checkIn, existing);
    if (!existing) transaction.set(reference, cleanFirestoreData(next) as Record<string, unknown>);
    else if (existing.status === "checked-in" && next.status === "checked-out") transaction.update(reference, { status: "checked-out", checkedOutAt: next.checkedOutAt ?? new Date().toISOString() });
  });
  return true;
}

export async function savePlaceReview(review: PlaceReview, actor?: User | null) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || !actor || actor.role !== "admin" || (actor.id !== uid && actor.authUid !== uid) || review.reviewedBy !== actor.id || !review.checkInIds.length || review.checkInIds.length > 100 || (review.destination && review.destination.id !== review.destinationId) || (review.status === "linked" && !review.destinationId) || (review.status === "dismissed" && Boolean(review.destinationId || review.destination))) return false;
  const { doc, runTransaction } = await import("firebase/firestore");
  await runTransaction(services.db, async (transaction) => {
    const references = review.checkInIds.map((id) => doc(services.db, FIRESTORE_COLLECTIONS.checkIns, id));
    const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
    const alreadyCommitted = snapshots.every((snapshot) => snapshot.exists() && snapshot.data().reviewStatus === review.status && snapshot.data().destinationId === review.destinationId && snapshot.data().reviewedBy === review.reviewedBy && snapshot.data().reviewedAt === review.reviewedAt);
    if (alreadyCommitted) return;
    if (snapshots.some((snapshot) => !snapshot.exists() || !snapshot.data().submittedPlace || ![undefined, "pending"].includes(snapshot.data().reviewStatus))) throw new Error("Place reports changed; refresh before reviewing");
    if (review.destinationId) {
      const place = await transaction.get(doc(services.db, FIRESTORE_COLLECTIONS.destinations, review.destinationId));
      if (!review.destination && !place.exists()) throw new Error("Catalogue place no longer exists");
      if (review.destination && place.exists()) throw new Error("Catalogue place already exists");
    }
    if (review.destination) transaction.set(doc(services.db, FIRESTORE_COLLECTIONS.destinations, review.destination.id), cleanFirestoreData(review.destination) as Record<string, unknown>);
    references.forEach((reference) => transaction.update(reference, { destinationId: review.destinationId, reviewStatus: review.status, reviewedBy: actor.id, reviewedAt: review.reviewedAt }));
  });
  return true;
}

export async function loadPlaceReviewRecords(actor: User) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || actor.role !== "admin" || (actor.id !== uid && actor.authUid !== uid)) return null;
  const { collection, getDocsFromServer, query, where } = await import("firebase/firestore");
  const snapshot = await getDocsFromServer(query(collection(services.db, FIRESTORE_COLLECTIONS.checkIns), where("reviewStatus", "==", "pending")));
  return snapshot.docs.map((record) => normalizeCheckIn({ ...record.data(), id: record.id }));
}

export async function subscribeCheckInRecords(actor: User, onChange: (records: AttractionCheckIn[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || (actor.id !== uid && actor.authUid !== uid)) return () => {};
  const { collection, query, where, onSnapshot } = await import("firebase/firestore");
  const source = collection(services.db, FIRESTORE_COLLECTIONS.checkIns);
  const scoped = actor.role === "admin" ? source : query(source, where("userId", "==", actor.id));
  return onSnapshot(scoped, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const records = snapshot.docs.map((record) => normalizeCheckIn({ ...record.data(), id: record.id }));
    acknowledgePendingCheckIns(records);
    onChange(records);
  }, onError);
}

export async function subscribePlaceReviewRecords(actor: User, onChange: (pending: AttractionCheckIn[], reviewed: AttractionCheckIn[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || actor.role !== "admin" || (actor.id !== uid && actor.authUid !== uid)) return () => {};
  const { collection, query, where, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(query(collection(services.db, FIRESTORE_COLLECTIONS.checkIns), where("reviewStatus", "==", "pending")), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache) return;
    const pending = snapshot.docs.map((record) => normalizeCheckIn({ ...record.data(), id: record.id }));
    const reviewed = snapshot.docChanges().filter((change) => change.type === "removed").map((change) => normalizeCheckIn({ ...change.doc.data(), id: change.doc.id })).filter((record) => record.reviewStatus === "linked" || record.reviewStatus === "dismissed");
    onChange(pending, reviewed);
  }, onError);
}

export async function saveSosAlertRecord(alert: SosAlert, actor?: User | null) {
  const services = getFirebaseServices();
  if (!services?.auth.currentUser || !actor) return false;
  const uid = services.auth.currentUser.uid;
  if ((actor.id !== uid && actor.authUid !== uid) || (actor.role !== "admin" && actor.id !== alert.userId)) return false;
  const { doc, runTransaction } = await import("firebase/firestore");
  const reference = doc(services.db, FIRESTORE_COLLECTIONS.sosAlerts, alert.id);
  await runTransaction(services.db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const existing = snapshot.exists() ? normalizeSosAlert({ ...snapshot.data(), id: snapshot.id }) : null;
    if (existing && existing.userId !== alert.userId) throw new Error("SOS ownership cannot change");
    const next = existing ? preferredSosAlert(alert, existing) : alert;
    if (next !== existing) {
      const saved = {
        ...next,
        ...(existing?.status === "resolved" ? { closureReason: existing.closureReason, closedBy: existing.closedBy, resolvedAt: existing.resolvedAt } : {}),
        ...(existing && actor.role === "tourist" ? { adminNote: existing.adminNote } : {}),
      };
      transaction.set(reference, cleanFirestoreData(saved) as Record<string, unknown>);
    }
  });
  return true;
}

export async function saveSosAlertChange(alert: SosAlert, actor?: User | null) {
  const uid = getFirebaseServices()?.auth.currentUser?.uid;
  if (!uid || !actor || (actor.id !== uid && actor.authUid !== uid)) return false;
  const job = queueCloudChanges(actor.id, [{ collection: FIRESTORE_COLLECTIONS.sosAlerts, id: alert.id, kind: "update", data: cleanFirestoreData(alert) as unknown as Record<string, unknown>, remove: [] }]);
  // Emergency requests bypass ordinary queued saves, but retain their own durable retry.
  const synced = await saveSosAlertRecord(alert, actor);
  if (synced && job) acknowledgeCloudJob(job);
  return synced;
}

export async function subscribeSosAlerts(actor: User, onChange: (alerts: SosAlert[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  if (!services?.auth.currentUser) return () => {};
  const uid = services.auth.currentUser.uid;
  if (actor.id !== uid && actor.authUid !== uid) return () => {};
  const { collection, query, where, onSnapshot } = await import("firebase/firestore");
  const source = collection(services.db, FIRESTORE_COLLECTIONS.sosAlerts);
  const scoped = actor.role === "admin" ? source : query(source, where("userId", "==", actor.id));
  return onSnapshot(scoped, (snapshot) => {
    onChange(snapshot.docs.map((record) => normalizeSosAlert({ ...record.data(), id: record.id })));
  }, onError);
}

export async function subscribeIncidentReports(actor: User, onChange: (reports: IncidentReport[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || (actor.id !== uid && actor.authUid !== uid)) return () => {};
  const { collection, query, where, onSnapshot } = await import("firebase/firestore");
  const source = collection(services.db, FIRESTORE_COLLECTIONS.incidentReports);
  const scoped = actor.role === "admin" ? source : query(source, where("userId", "==", actor.id));
  return onSnapshot(scoped, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    onChange(snapshot.docs.map((record) => normalizeIncidentReport({ ...record.data(), id: record.id })));
  }, onError);
}

export function loadSession(): string | null {
  try {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) return session;
  } catch { /* Session storage may be blocked. */ }
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}

export function saveSession(userId: string, rememberSession = true) {
  privateCacheCleared = false;
  clearSession();
  try { (rememberSession ? localStorage : sessionStorage).setItem(SESSION_KEY, userId); }
  catch { /* Keep the current in-memory login without creating a persistent session. */ }
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* Storage can be blocked. */ }
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage can be blocked. */ }
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

export async function loadCloudData(fallbackActor?: User | null, isCurrent = () => true) {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  if (!services.auth.currentUser) {
    return null;
  }

  const { collection, doc, getDocFromServer: getDoc, getDocsFromServer: getDocs, query, where } = await import("firebase/firestore");
  const authUid = services.auth.currentUser.uid;
  const cachedActor = fallbackActor ?? loadData().users.find((user) => user.id === authUid || user.authUid === authUid);
  if (cachedActor) await saveCloudData(loadData(), cachedActor);

  const readDocument = async <T>(name: string, id: string) => {
      const snapshot = await getDoc(doc(services.db, name, id));
      return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null;
  };

  const readCollection = async <T>(name: string) => {
      const snapshot = await getDocs(collection(services.db, name));
      return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
  };

  const readOwnedCollection = async <T>(name: string) => {
      const snapshot = await getDocs(query(collection(services.db, name), where("userId", "==", authUid)));
      return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as T);
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
  const readTripHistory = async <T extends { id: string }>(modern: string, legacy: string) => {
    const [current, older] = await Promise.all([readScopedCollection<T>(modern), readScopedCollection<T>(legacy)]);
    return [...new Map([...older, ...current].map((record) => [record.id, record])).values()];
  };
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
    readTripHistory<TripSession>(FIRESTORE_COLLECTIONS.tripSessions, LEGACY_FIRESTORE_COLLECTIONS.trips),
    readTripHistory<MovementPoint>(FIRESTORE_COLLECTIONS.movementRecords, LEGACY_FIRESTORE_COLLECTIONS.movementPoints),
    readCollection<Destination>(FIRESTORE_COLLECTIONS.destinations),
    readScopedPreferredCollection<AnalysisResult>(FIRESTORE_COLLECTIONS.aiAnalyses, LEGACY_FIRESTORE_COLLECTIONS.analyses),
    readScopedCollection<Recommendation>(FIRESTORE_COLLECTIONS.recommendations),
    readScopedCollection<SosAlert>(FIRESTORE_COLLECTIONS.sosAlerts),
    readScopedCollection<IncidentReport>(FIRESTORE_COLLECTIONS.incidentReports),
    readScopedCollection<AttractionCheckIn>(FIRESTORE_COLLECTIONS.checkIns),
    readCollection<GeoFence>(FIRESTORE_COLLECTIONS.geofences),
  ]);

  if (services.auth.currentUser?.uid !== authUid || !isCurrent()) return null;

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
      checkIns: mergeCheckInRecords(loadPendingCheckIns(authUid), checkIns),
      geofences,
    });
    saveLocalData(data);
    return data;
  }

  const data = normalizeAppData({});
  saveLocalData(data);
  return data;
}

export async function saveCloudData(data: AppData, actor?: User | null, previousData?: AppData) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  const currentActor = actor ?? data.users.find((user) => user.authUid === uid || user.id === uid);
  if (!uid || !currentActor || (currentActor.id !== uid && currentActor.authUid !== uid)) return false;
  if (previousData) {
    const after = cloudTables(data, currentActor);
    const changes = buildCloudChanges(cloudTables(previousData, currentActor), after, new Set([
      FIRESTORE_COLLECTIONS.locationConsents, FIRESTORE_COLLECTIONS.tripSessions, FIRESTORE_COLLECTIONS.movementRecords,
      FIRESTORE_COLLECTIONS.aiAnalyses, FIRESTORE_COLLECTIONS.recommendations, FIRESTORE_COLLECTIONS.incidentReports,
      ...(currentActor.role === "admin" ? [FIRESTORE_COLLECTIONS.destinations, FIRESTORE_COLLECTIONS.destinationCategories, FIRESTORE_COLLECTIONS.geofences] : []),
    ]));
    const lifecycleCollections: string[] = [FIRESTORE_COLLECTIONS.sosAlerts, FIRESTORE_COLLECTIONS.checkIns];
    queueCloudChanges(currentActor.id, changes.map((change) => lifecycleCollections.includes(change.collection)
      ? { ...change, data: cleanFirestoreData(after[change.collection].find((row) => row.id === change.id)!.data), remove: [] }
      : change));
  }
  const synced = await flushCloudChanges(currentActor, (change) => {
    if (change.collection === FIRESTORE_COLLECTIONS.sosAlerts) return saveSosAlertRecord(change.data as unknown as SosAlert, currentActor);
    if (change.collection === FIRESTORE_COLLECTIONS.checkIns) return saveCheckInRecord(change.data as unknown as AttractionCheckIn, currentActor);
    return Promise.resolve(undefined);
  });
  if (!synced) return false;
  for (const checkIn of loadPendingCheckIns(currentActor.id)) {
    if (!await saveCheckInRecord(checkIn, currentActor)) return false;
    acknowledgePendingCheckIns([checkIn]);
  }
  return true;
}

function cloudTables(data: AppData, actor: User): CloudTables {
  const tables: CloudTables = {};
  const isDemoUser = (id: string) => demoUserIds.has(id) || id.startsWith("tourist-seed-");
  const owned = <T extends { userId?: string }>(rows: T[]) => rows.filter((row) => !isDemoUser(row.userId ?? "") && (actor.role === "admin" || row.userId === actor.id));
  const add = <T>(name: string, rows: T[], getId: (row: T) => string) => {
    tables[name] = rows.map((row) => ({ id: getId(row), data: row as Record<string, unknown> }));
  };
  const users = data.users.filter((user) => !isDemoUser(user.id) && (actor.role === "admin" || user.id === actor.id));
  const tourists = users.filter((user) => user.role === "tourist");
  add(FIRESTORE_COLLECTIONS.users, users.map(publicUser), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.touristProfiles, tourists.map(buildTouristProfileDocument), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.touristPreferences, tourists.map(buildTouristPreferenceDocument), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.locationConsents, owned(data.consents), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.tripSessions, owned(data.trips), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.movementRecords, owned(data.points), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.aiAnalyses, owned(data.analyses), (row) => row.tripId);
  add(FIRESTORE_COLLECTIONS.recommendations, owned(data.recommendations), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.incidentReports, owned(data.incidentReports), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.sosAlerts, owned(data.sosAlerts), (row) => row.id);
  add(FIRESTORE_COLLECTIONS.checkIns, owned(data.checkIns).filter((row) => !row.isDemo), (row) => row.id);
  if (actor.role === "admin") {
    add(FIRESTORE_COLLECTIONS.destinationCategories, buildDestinationCategoryRows(data.destinations), (row) => row.id);
    add(FIRESTORE_COLLECTIONS.destinations, data.destinations, (row) => row.id);
    add(FIRESTORE_COLLECTIONS.geofences, data.geofences, (row) => row.id);
  }
  return tables;
}

export function mergeUserDocuments(
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
      role: currentUser?.role ?? "tourist",
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
      trackingSuggestionMode: preference.trackingSuggestionMode,
      trackingSuggestionRadiusKm: preference.trackingSuggestionRadiusKm,
      discoveryLocationMode: preference.discoveryLocationMode ?? currentUser.discoveryLocationMode,
      discoveryAreaId: preference.discoveryAreaId ?? currentUser.discoveryAreaId,
      hiddenDestinationIds: preference.hiddenDestinationIds ?? currentUser.hiddenDestinationIds,
      eventAnnouncementsEnabled: preference.eventAnnouncementsEnabled ?? currentUser.eventAnnouncementsEnabled,
      sampleActivityEnabled: preference.sampleActivityEnabled ?? currentUser.sampleActivityEnabled,
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
    trackingSuggestionMode: user.trackingSuggestionMode ?? "balanced",
    trackingSuggestionRadiusKm: user.trackingSuggestionRadiusKm ?? 2,
    discoveryLocationMode: user.discoveryLocationMode ?? "current",
    discoveryAreaId: user.discoveryAreaId,
    hiddenDestinationIds: user.hiddenDestinationIds ?? [],
    eventAnnouncementsEnabled: user.eventAnnouncementsEnabled ?? true,
    sampleActivityEnabled: user.sampleActivityEnabled ?? !user.authUid,
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
  if (privateCacheCleared) return;
  const raw = JSON.stringify(data);
  localStorage.setItem(DATA_KEY, raw);
  localDataCache = { storage: localStorage, raw, data };
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
    imageUrl: destination.imageUrl ?? fallback?.imageUrl,
    imageAlt: destination.imageAlt ?? fallback?.imageAlt,
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
    closureReason: alert.closureReason === "cancelled" || alert.closureReason === "help-received" ? alert.closureReason : undefined,
    closedBy: alert.closedBy,
    adminNote: alert.adminNote,
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
    adminNote: report.adminNote,
    photoDataUrl: report.photoDataUrl,
    photoName: report.photoName,
    photoType: report.photoType,
    photoSizeBytes: Number.isFinite(report.photoSizeBytes) ? report.photoSizeBytes : undefined,
    photoCapturedAt: report.photoCapturedAt,
  };
}

function normalizeCheckIn(checkIn: Partial<AttractionCheckIn>): AttractionCheckIn {
  const checkedInAt = checkIn.checkedInAt ?? new Date().toISOString();
  const status = checkIn.status === "checked-out" ? "checked-out" : "checked-in";
  const submitted = checkIn.submittedPlace;
  const submittedPlace = submitted && typeof submitted.name === "string" && typeof submitted.address === "string" ? {
    name: submitted.name.slice(0, 100), address: submitted.address.slice(0, 300),
    city: typeof submitted.city === "string" ? submitted.city.slice(0, 80) : "",
    state: submitted.state ? normalizeMalaysianState(submitted.state) : undefined,
    category: (["cultural", "nature", "urban", "heritage", "food", "coastal"] as const).includes(submitted.category) ? submitted.category : "cultural" as const,
    note: typeof submitted.note === "string" ? submitted.note.slice(0, 500) : "",
    accuracyMeters: Number.isFinite(submitted.accuracyMeters) ? submitted.accuracyMeters : undefined,
  } : undefined;

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
    submittedPlace,
    reviewStatus: submittedPlace ? (["linked", "dismissed"] as const).includes(checkIn.reviewStatus as "linked" | "dismissed") ? checkIn.reviewStatus : "pending" : undefined,
    reviewedBy: checkIn.reviewedBy,
    reviewedAt: checkIn.reviewedAt,
    isDemo: checkIn.isDemo === true ? true : undefined,
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
