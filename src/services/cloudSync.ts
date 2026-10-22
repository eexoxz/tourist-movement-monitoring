import type { User } from "../types";
import { getFirebaseServices } from "./firebaseClient";
import { acknowledgeCloudJob, pendingCloudJobs, type CloudChange } from "./cloudChanges";

const saves = new Map<string, Promise<boolean>>();
const CHUNK_SIZE = 40;

export function flushCloudChanges(actor: User, special: (change: CloudChange) => Promise<boolean | undefined>) {
  const previous = saves.get(actor.id) ?? Promise.resolve(true);
  const next = previous.catch(() => false).then(async () => {
    const services = getFirebaseServices();
    const uid = services?.auth.currentUser?.uid;
    if (!services || !uid || (actor.id !== uid && actor.authUid !== uid)) return false;
    const { doc, runTransaction, deleteField } = await import("firebase/firestore");
    const assertSession = () => {
      if (services.auth.currentUser?.uid !== uid) throw new Error("Cloud session changed during save");
    };
    // Admin creates can involve different owners, each with a deletion-lock rule lookup.
    const chunkSize = actor.role === "admin" ? 15 : CHUNK_SIZE;
    for (const job of pendingCloudJobs(actor)) {
      for (let offset = 0; offset < job.changes.length; offset += chunkSize) {
        assertSession();
        const changes: CloudChange[] = [];
        for (const change of job.changes.slice(offset, offset + chunkSize)) {
          const handled = await special(change);
          if (handled === false) throw new Error("Cloud record was not accepted");
          if (handled === undefined) changes.push(change);
        }
        if (!changes.length) continue;
        await runTransaction(services.db, async (transaction) => {
          assertSession();
          const references = changes.map((change) => doc(services.db, change.collection, change.id));
          const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
          // Old trips must be edited where they were loaded, not silently acknowledged as missing.
          const legacyReferences = changes.map((change) => change.collection === "trip_sessions" && change.kind !== "create" ? doc(services.db, "trips", change.id) : null);
          const legacySnapshots = await Promise.all(legacyReferences.map((reference) => reference ? transaction.get(reference) : null));
          assertSession();
          changes.forEach((change, index) => {
            const legacy = legacySnapshots[index];
            const reference = snapshots[index].exists() ? references[index] : legacyReferences[index] ?? references[index];
            const exists = snapshots[index].exists() || Boolean(legacy?.exists());
            if (change.kind === "create") {
              if (!exists) transaction.set(reference, change.data);
            } else if (exists && change.kind === "delete") {
              transaction.delete(reference);
              if (snapshots[index].exists() && legacy?.exists()) transaction.delete(legacyReferences[index]!);
            }
            else if (exists) {
              const update = { ...change.data, ...Object.fromEntries(change.remove.map((field) => [field, deleteField()])) };
              const stored = snapshots[index].exists() ? snapshots[index].data() : legacy?.data();
              if (change.collection === "trip_sessions" && stored?.hiddenFromHistoryAt) {
                update.hiddenFromHistoryAt = stored.hiddenFromHistoryAt;
                update.status = "completed";
                if (stored.endedAt) update.endedAt = stored.endedAt;
              }
              transaction.update(reference, update);
            }
            // A deletion on another device wins over a late edit; never recreate the deleted record.
          });
        });
      }
      assertSession();
      acknowledgeCloudJob(job);
    }
    return true;
  });
  saves.set(actor.id, next);
  void next.finally(() => { if (saves.get(actor.id) === next) saves.delete(actor.id); }).catch(() => undefined);
  return next;
}
