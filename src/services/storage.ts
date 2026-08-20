import { initialData } from "../data/demoData";
import type { AppData, User } from "../types";

const DATA_KEY = "tourist-movement-monitoring:data";
const SESSION_KEY = "tourist-movement-monitoring:session";

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
