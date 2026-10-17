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
    for (const job of pendingCloudJobs(actor)) {
      for (let offset = 0; offset < job.changes.length; offset += CHUNK_SIZE) {
        assertSession();
        const changes: CloudChange[] = [];
        for (const change of job.changes.slice(offset, offset + CHUNK_SIZE)) {
          const handled = await special(change);
          if (handled === false) throw new Error("Cloud record was not accepted");
          if (handled === undefined) changes.push(change);
        }
        if (!changes.length) continue;
        await runTransaction(services.db, async (transaction) => {
          assertSession();
          const references = changes.map((change) => doc(services.db, change.collection, change.id));
          const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
          assertSession();
          changes.forEach((change, index) => {
            const reference = references[index];
            const exists = snapshots[index].exists();
            if (change.kind === "create") {
              if (!exists) transaction.set(reference, change.data);
            } else if (exists && change.kind === "delete") transaction.delete(reference);
            else if (exists) transaction.update(reference, { ...change.data, ...Object.fromEntries(change.remove.map((field) => [field, deleteField()])) });
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
