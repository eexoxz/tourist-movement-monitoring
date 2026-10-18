import { getFirebaseServices } from "./firebaseClient";

export type DeletionPhase = "verifying" | "records" | "profile" | "authentication";
export class AccountDeletionError extends Error {
  constructor(public code: "unavailable" | "session" | "timeout" | "local") { super(code); }
}

export const accountDeletionCollection = "account_deletions";
export const privateAccountCollections = [
  "location_consents", "trip_sessions", "movement_records", "ai_analyses",
  "recommendations", "sos_alerts", "incident_reports", "attraction_checkins",
  "tourist_itineraries", "consents", "trips", "movementPoints", "analyses",
] as const;

async function deadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new AccountDeletionError("timeout")), 15000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function hasAccountDeletion(uid: string) {
  const services = getFirebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new AccountDeletionError("session");
  const { doc, getDocFromServer } = await import("firebase/firestore");
  return (await deadline(getDocFromServer(doc(services.db, accountDeletionCollection, uid)))).exists();
}

export async function subscribeAccountDeletion(uid: string, onStarted: () => void, onError: () => void) {
  const services = getFirebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) return () => {};
  const { doc, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(doc(services.db, accountDeletionCollection, uid), (snapshot) => {
    if (!snapshot.metadata.fromCache && snapshot.exists() && services.auth.currentUser?.uid === uid) onStarted();
  }, onError);
}

export async function deleteOwnAccount(uid: string, password: string, callbacks: {
  onStarted: () => void;
  onPhase: (phase: DeletionPhase) => void;
  clearLocal: () => void;
}) {
  const services = getFirebaseServices();
  const user = services?.auth.currentUser;
  if (!services || !user || user.uid !== uid || !user.email || !user.providerData.some((provider) => provider.providerId === "password")) throw new AccountDeletionError("session");
  const assertSession = () => { if (services.auth.currentUser?.uid !== uid) throw new AccountDeletionError("session"); };
  callbacks.onPhase("verifying");
  const { EmailAuthProvider, reauthenticateWithCredential, deleteUser } = await import("firebase/auth");
  await deadline(reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)));
  await deadline(user.getIdToken(true));
  assertSession();
  const { collection, doc, getDocsFromServer, limit, query, runTransaction, serverTimestamp, where, writeBatch } = await import("firebase/firestore");
  const marker = doc(services.db, accountDeletionCollection, uid);
  // The persistent lock makes interrupted cleanup retryable and prevents stale tabs recreating data.
  await deadline(runTransaction(services.db, async (transaction) => {
    assertSession();
    const pending = await transaction.get(marker);
    if (pending.exists()) return;
    const account = await transaction.get(doc(services.db, "users", uid));
    if (!account.exists() || account.data().role !== "tourist") throw new AccountDeletionError("unavailable");
    transaction.set(marker, { version: 1, startedAt: serverTimestamp() });
  }));
  assertSession();
  callbacks.onStarted();
  callbacks.onPhase("records");
  for (const name of privateAccountCollections) {
    while (true) {
      assertSession();
      const rows = await deadline(getDocsFromServer(query(collection(services.db, name), where("userId", "==", uid), limit(100))));
      if (rows.empty) break;
      assertSession();
      const batch = writeBatch(services.db);
      rows.docs.forEach((row) => batch.delete(row.ref));
      await deadline(batch.commit());
    }
  }
  callbacks.onPhase("profile");
  assertSession();
  const identities = writeBatch(services.db);
  for (const name of ["tourist_profiles", "tourist_preferences", "users"]) identities.delete(doc(services.db, name, uid));
  await deadline(identities.commit());
  assertSession();
  try { callbacks.clearLocal(); } catch { throw new AccountDeletionError("local"); }
  callbacks.onPhase("authentication");
  // Authentication is deleted last: failed data cleanup never strands inaccessible private records.
  await deadline(deleteUser(user));
}
