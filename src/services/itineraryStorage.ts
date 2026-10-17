import type { Itinerary, User } from "../types";
import { getFirebaseServices, isFirebaseConfigured } from "./firebaseClient";
import { validItinerary, type ItineraryEntry } from "./itineraries";

export class ItineraryError extends Error {
  constructor(public code: "conflict" | "unavailable" | "invalid") { super(code); }
}

const collectionName = "tourist_itineraries";
const cacheKey = (userId: string) => `tourist-movement-monitoring:itineraries:${userId}`;
const openDrafts = new Map<string, () => ItineraryEntry[]>();

export function registerItineraryDrafts(userId: string, read: () => ItineraryEntry[]) {
  openDrafts.set(userId, read);
  return () => { if (openDrafts.get(userId) === read) openDrafts.delete(userId); };
}

export function readItineraryDrafts(userId: string) {
  return openDrafts.get(userId)?.() ?? loadItineraryCache(userId);
}

export function loadItineraryCache(userId: string): ItineraryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(cacheKey(userId)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ItineraryEntry => Boolean(entry && typeof entry === "object" && typeof entry.dirty === "boolean" && validItinerary(entry.plan) && entry.plan.userId === userId));
  } catch { return []; }
}

export function cacheItineraries(userId: string, entries: ItineraryEntry[]) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(entries.filter((entry) => entry.plan.userId === userId)));
    return true;
  } catch { return false; }
}

function requireOwner(actor: User) {
  const services = getFirebaseServices();
  if (!services?.auth.currentUser || actor.role !== "tourist" || actor.id !== services.auth.currentUser.uid) throw new ItineraryError("unavailable");
  return services;
}

export async function saveItinerary(plan: Itinerary, actor: User): Promise<Itinerary> {
  if (!validItinerary(plan) || !plan.title.trim() || plan.deletedAt || plan.userId !== actor.id) throw new ItineraryError("invalid");
  const next = { ...plan, title: plan.title.trim(), revision: plan.revision + 1, updatedAt: new Date().toISOString() };
  if (!isFirebaseConfigured()) return next;
  const services = requireOwner(actor);
  const { doc, runTransaction } = await import("firebase/firestore");
  await runTransaction(services.db, async (transaction) => {
    const ref = doc(services.db, collectionName, plan.id);
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? snapshot.data() : null;
    if (existing ? existing.userId !== actor.id || existing.revision !== plan.revision || existing.deletedAt : plan.revision !== 0) throw new ItineraryError("conflict");
    transaction.set(ref, next);
  });
  return next;
}

export async function deleteItinerary(plan: Itinerary, actor: User) {
  if (plan.userId !== actor.id) throw new ItineraryError("invalid");
  if (!isFirebaseConfigured()) return;
  const services = requireOwner(actor);
  const { doc, runTransaction } = await import("firebase/firestore");
  await runTransaction(services.db, async (transaction) => {
    const ref = doc(services.db, collectionName, plan.id);
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists() ? snapshot.data() : null;
    if (existing?.deletedAt) return;
    if (existing ? existing.userId !== actor.id || existing.revision !== plan.revision : plan.revision !== 0) throw new ItineraryError("conflict");
    // A tombstone prevents a delayed offline save from recreating a deleted plan.
    const now = new Date().toISOString();
    transaction.set(ref, { ...plan, title: plan.title.trim() || "Untitled", deletedAt: now, updatedAt: now, revision: plan.revision + 1 });
  });
}

export async function subscribeItineraries(actor: User, onChange: (plans: Itinerary[]) => void, onError: () => void) {
  const services = requireOwner(actor);
  const { collection, query, where, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(query(collection(services.db, collectionName), where("userId", "==", actor.id), where("deletedAt", "==", "")), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const plans = snapshot.docs.map((record) => ({ ...record.data(), id: record.id })).filter(validItinerary);
    onChange(plans);
  }, onError);
}

export async function itineraryDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new ItineraryError("unavailable")), 12000); })]);
  } finally { clearTimeout(timer); }
}
