import { initialData } from "../data/demoData";
import type { AppData, User } from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";

const DATA_KEY = "tourist-movement-monitoring:data";
const SESSION_KEY = "tourist-movement-monitoring:session";
const DATA_COLLECTION = "prototype";
const DATA_DOCUMENT = "appData";

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

export function saveData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
  void saveCloudData(data).catch((error) => {
    console.warn("Cloud save skipped:", error);
  });
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
  return isFirebaseConfigured() ? "Firebase + local backup" : "Local browser storage";
}

export async function loadCloudData() {
  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(services.db, DATA_COLLECTION, DATA_DOCUMENT);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, initialData);
    saveLocalData(initialData);
    return initialData;
  }

  const data = snapshot.data() as AppData;
  saveLocalData(data);
  return data;
}

export async function saveCloudData(data: AppData) {
  const services = getFirebaseServices();
  if (!services) {
    return;
  }

  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(services.db, DATA_COLLECTION, DATA_DOCUMENT), data);
}

function saveLocalData(data: AppData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}
