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

export function loadData(): AppData {
  const raw = localStorage.getItem(DATA_KEY);
  if (!raw) {
    saveData(initialData);
    return initialData;
  }

  try {
    return JSON.parse(raw) as AppData;
  } catch {
    saveData(initialData);
    return initialData;
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

export function resetData() {
  saveData(initialData);
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
    const data: AppData = {
      users: users.map((user) => ({ ...user, password: "" })),
      consents,
      trips,
      points,
      destinations,
      analyses,
      recommendations,
    };
    saveLocalData(data);
    return data;
  }

  const legacySnapshot = await getDoc(doc(services.db, LEGACY_DATA_COLLECTION, LEGACY_DATA_DOCUMENT));
  const data = legacySnapshot.exists() ? (legacySnapshot.data() as AppData) : initialData;

  await saveCloudData(data);
  saveLocalData(data);
  return data;
}

export async function saveCloudData(data: AppData, actor?: User | null) {
  const services = getFirebaseServices();
  if (!services) {
    return false;
  }

  const { collection, doc, getDocs, writeBatch } = await import("firebase/firestore");
  const authUid = services.auth.currentUser?.uid;
  const currentActor = actor ?? data.users.find((user) => user.authUid === authUid || user.id === authUid);

  if (!currentActor) {
    return false;
  }

  const batch = writeBatch(services.db);
  const syncCollection = async <T>(name: string, rows: T[], getId: (row: T) => string) => {
    const existing = await getDocs(collection(services.db, name));
    const nextIds = new Set<string>();

    rows.forEach((row) => {
      const id = getId(row);
      nextIds.add(id);
      batch.set(doc(services.db, name, id), cleanFirestoreData(row) as Record<string, unknown>);
    });

    existing.docs.forEach((snapshot) => {
      if (!nextIds.has(snapshot.id)) {
        batch.delete(snapshot.ref);
      }
    });
  };

  if (currentActor?.role === "tourist") {
    const ownTripIds = new Set(data.trips.filter((trip) => trip.userId === currentActor.id).map((trip) => trip.id));
    batch.set(doc(services.db, FIRESTORE_COLLECTIONS.users, currentActor.id), cleanFirestoreData(publicUser(currentActor)) as Record<string, unknown>);

    data.consents.filter((consent) => consent.userId === currentActor.id).forEach((consent) => {
      batch.set(doc(services.db, FIRESTORE_COLLECTIONS.consents, consent.id), cleanFirestoreData(consent) as Record<string, unknown>);
    });
    data.trips.filter((trip) => trip.userId === currentActor.id).forEach((trip) => {
      batch.set(doc(services.db, FIRESTORE_COLLECTIONS.trips, trip.id), cleanFirestoreData(trip) as Record<string, unknown>);
    });
    data.points.filter((point) => ownTripIds.has(point.tripId)).forEach((point) => {
      batch.set(doc(services.db, FIRESTORE_COLLECTIONS.movementPoints, point.id), cleanFirestoreData(point) as Record<string, unknown>);
    });
    data.analyses.filter((analysis) => analysis.userId === currentActor.id).forEach((analysis) => {
      batch.set(doc(services.db, FIRESTORE_COLLECTIONS.analyses, analysis.tripId), cleanFirestoreData(analysis) as Record<string, unknown>);
    });
    data.recommendations.filter((recommendation) => recommendation.userId === currentActor.id).forEach((recommendation) => {
      batch.set(doc(services.db, FIRESTORE_COLLECTIONS.recommendations, recommendation.id), cleanFirestoreData(recommendation) as Record<string, unknown>);
    });
  } else {
    await syncCollection(FIRESTORE_COLLECTIONS.users, data.users.map(publicUser), (user) => user.id);
    await syncCollection(FIRESTORE_COLLECTIONS.consents, data.consents, (consent) => consent.id);
    await syncCollection(FIRESTORE_COLLECTIONS.trips, data.trips, (trip) => trip.id);
    await syncCollection(FIRESTORE_COLLECTIONS.movementPoints, data.points, (point) => point.id);
    await syncCollection(FIRESTORE_COLLECTIONS.destinations, data.destinations, (destination) => destination.id);
    await syncCollection(FIRESTORE_COLLECTIONS.analyses, data.analyses, (analysis) => analysis.tripId);
    await syncCollection(FIRESTORE_COLLECTIONS.recommendations, data.recommendations, (recommendation) => recommendation.id);
  }

  await batch.commit();
  return true;
}

function saveLocalData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function cleanFirestoreData<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}
