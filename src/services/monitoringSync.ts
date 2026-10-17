import type { AppData, MovementPoint, TripSession, User } from "../types";
import { pendingCloudJobs, type CloudChange } from "./cloudChanges";
import { getFirebaseServices } from "./firebaseClient";

export type MonitoringSnapshot =
  | { key: "users"; collection: "users"; records: User[]; removed: string[] }
  | { key: "trips"; collection: "trip_sessions"; records: TripSession[]; removed: string[] }
  | { key: "points"; collection: "movement_records"; records: MovementPoint[]; removed: string[] };

export function mergeMonitoringSnapshot(data: AppData, snapshot: MonitoringSnapshot, pending: CloudChange[]): AppData {
  const records = new Map<string, User | TripSession | MovementPoint>(data[snapshot.key].map((row) => [row.id, row]));
  const originals = new Map<string, User | TripSession | MovementPoint | undefined>();
  const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);
  const remember = (id: string) => { if (!originals.has(id)) originals.set(id, records.get(id)); };
  for (const id of snapshot.removed) { if (records.has(id)) { remember(id); records.delete(id); } }
  for (const record of snapshot.records) {
    if (!same(records.get(record.id), record)) { remember(record.id); records.set(record.id, record); }
  }
  for (const change of pending.filter((row) => row.collection === snapshot.collection)) {
    const current = records.get(change.id);
    if (change.kind === "delete" && current) { remember(change.id); records.delete(change.id); }
    else if (change.kind === "create" && !current) { remember(change.id); records.set(change.id, change.data as unknown as User | TripSession | MovementPoint); }
    else if (current && change.kind === "update") {
      const next = { ...current, ...change.data } as unknown as Record<string, unknown>;
      change.remove.forEach((field) => { delete next[field]; });
      if (!same(current, next)) { remember(change.id); records.set(change.id, next as unknown as User | TripSession | MovementPoint); }
    }
  }
  if (![...originals].some(([id, original]) => !same(original, records.get(id)))) return data;
  return { ...data, [snapshot.key]: [...records.values()] };
}

export async function subscribeAdminMonitoring(actor: User, onChange: (snapshots: MonitoringSnapshot[], pending: CloudChange[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || actor.role !== "admin" || (actor.id !== uid && actor.authUid !== uid)) return () => {};
  const { collection, onSnapshot } = await import("firebase/firestore");
  const sources = [{ key: "users", collection: "users" }, { key: "trips", collection: "trip_sessions" }, { key: "points", collection: "movement_records" }] as const;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const queued = new Map<string, { source: typeof sources[number]; changes: Map<string, { removed: boolean; record: Record<string, unknown> }> }>();
  const flush = () => {
    timer = undefined;
    if (stopped || services.auth.currentUser?.uid !== uid) { queued.clear(); return; }
    const snapshots = [...queued.values()].map(({ source, changes }) => ({ ...source,
      records: [...changes.values()].filter((change) => !change.removed).map((change) => change.record),
      removed: [...changes.entries()].filter(([, change]) => change.removed).map(([id]) => id),
    } as MonitoringSnapshot));
    queued.clear();
    if (snapshots.length) onChange(snapshots, pendingCloudJobs(actor).flatMap((job) => job.changes));
  };
  const stops = sources.map((source) => onSnapshot(collection(services.db, source.collection), { includeMetadataChanges: true }, (snapshot) => {
    if (stopped || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const changes = snapshot.docChanges();
    if (!changes.length) return;
    const batch = queued.get(source.key) ?? { source, changes: new Map() };
    changes.forEach((change) => batch.changes.set(change.doc.id, { removed: change.type === "removed", record: { ...change.doc.data(), id: change.doc.id, ...(source.key === "users" ? { password: "" } : {}) } }));
    queued.set(source.key, batch);
    if (timer === undefined) timer = setTimeout(flush, 100);
  }, onError));
  return () => { stopped = true; clearTimeout(timer); queued.clear(); stops.forEach((stop) => stop()); };
}
