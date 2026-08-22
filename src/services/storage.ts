import { initialData } from "../data/demoData";
import type { AnalysisResult, AppData, Destination, LocationConsent, MovementPoint, Recommendation, TripSession, User } from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";

const DATA_KEY = "tourist-movement-monitoring:data";
const SESSION_KEY = "tourist-movement-monitoring:session";
const LEGACY_DATA_COLLECTION = "prototype";
const LEGACY_DATA_DOCUMENT = "appData";

const FIRESTORE_COLLECTIONS = {
  users: "users",
  consents: "consents",
  trips: "trips",
  movementPoints: "movementPoints",
  destinations: "destinations",
  analyses: "analyses",
  recommendations: "recommendations",
} as const;
const FIRESTORE_BATCH_LIMIT = 450;

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

  const { collection, doc, getDoc, getDocs } = await import("firebase/firestore");
  const readCollection = async <T>(name: string) => {
    const snapshot = await getDocs(collection(services.db, name));
    return snapshot.docs.map((document) => document.data() as T);
  };
  const [users, consents, trips, points, destinations, analyses, recommendations] = await Promise.all([
    readCollection<Omit<User, "password">>(FIRESTORE_COLLECTIONS.users),
    readCollection<LocationConsent>(FIRESTORE_COLLECTIONS.consents),
    readCollection<TripSession>(FIRESTORE_COLLECTIONS.trips),
    readCollection<MovementPoint>(FIRESTORE_COLLECTIONS.movementPoints),
    readCollection<Destination>(FIRESTORE_COLLECTIONS.destinations),
    readCollection<AnalysisResult>(FIRESTORE_COLLECTIONS.analyses),
    readCollection<Recommendation>(FIRESTORE_COLLECTIONS.recommendations),
  ]);

  const hasStructuredData =
    users.length > 0 || consents.length > 0 || trips.length > 0 || points.length > 0 || destinations.length > 0 || analyses.length > 0 || recommendations.length > 0;

  if (hasStructuredData) {
    const data = normalizeAppData({
      users: users.map((user) => ({ ...user, password: "" })),
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

  const { collection, doc, getDocs, query, where, writeBatch } = await import("firebase/firestore");
  const authUid = services.auth.currentUser?.uid;
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
    const existingTrips = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.trips), where("userId", "==", currentActor.id)));
    const nextConsentIds = new Set(data.consents.filter((consent) => consent.userId === currentActor.id).map((consent) => consent.id));
    const nextTripIds = new Set(data.trips.filter((trip) => trip.userId === currentActor.id).map((trip) => trip.id));
    const nextPointIds = new Set(data.points.filter((point) => ownTripIds.has(point.tripId)).map((point) => point.id));
    const nextAnalysisIds = new Set(data.analyses.filter((analysis) => analysis.userId === currentActor.id).map((analysis) => analysis.tripId));
    const nextRecommendationIds = new Set(data.recommendations.filter((recommendation) => recommendation.userId === currentActor.id).map((recommendation) => recommendation.id));

    await queueWrite((currentBatch) =>
      currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.users, currentActor.id), cleanFirestoreData(publicUser(currentActor)) as Record<string, unknown>)
    );

    for (const consent of data.consents.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.consents, consent.id), cleanFirestoreData(consent) as Record<string, unknown>));
    }
    for (const trip of data.trips.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.trips, trip.id), cleanFirestoreData(trip) as Record<string, unknown>));
    }
    for (const point of data.points.filter((row) => ownTripIds.has(row.tripId))) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.movementPoints, point.id), cleanFirestoreData(point) as Record<string, unknown>));
    }
    for (const analysis of data.analyses.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) => currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.analyses, analysis.tripId), cleanFirestoreData(analysis) as Record<string, unknown>));
    }
    for (const recommendation of data.recommendations.filter((row) => row.userId === currentActor.id)) {
      await queueWrite((currentBatch) =>
        currentBatch.set(doc(db, FIRESTORE_COLLECTIONS.recommendations, recommendation.id), cleanFirestoreData(recommendation) as Record<string, unknown>)
      );
    }

    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.consents, nextConsentIds);
    for (const snapshot of existingTrips.docs) {
      const trip = snapshot.data() as TripSession;
      if (trip.userId === currentActor.id && !nextTripIds.has(snapshot.id)) {
        await queueWrite((currentBatch) => currentBatch.delete(snapshot.ref));
      }
    }
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.movementPoints, nextPointIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.analyses, nextAnalysisIds);
    await deleteMissingOwnedDocs(FIRESTORE_COLLECTIONS.recommendations, nextRecommendationIds);
  } else {
    await syncCollection(FIRESTORE_COLLECTIONS.users, data.users.map(publicUser), (user) => user.id);
    await syncCollection(FIRESTORE_COLLECTIONS.consents, data.consents, (consent) => consent.id);
    await syncCollection(FIRESTORE_COLLECTIONS.trips, data.trips, (trip) => trip.id);
    await syncCollection(FIRESTORE_COLLECTIONS.movementPoints, data.points, (point) => point.id);
    await syncCollection(FIRESTORE_COLLECTIONS.destinations, data.destinations, (destination) => destination.id);
    await syncCollection(FIRESTORE_COLLECTIONS.analyses, data.analyses, (analysis) => analysis.tripId);
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
    clusterCentroid: {
      cultural: analysis.clusterCentroid?.cultural ?? 0,
      nature: analysis.clusterCentroid?.nature ?? 0,
      urban: analysis.clusterCentroid?.urban ?? 0,
      heritage: analysis.clusterCentroid?.heritage ?? 0,
      food: analysis.clusterCentroid?.food ?? 0,
      coastal: analysis.clusterCentroid?.coastal ?? 0,
    },
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
