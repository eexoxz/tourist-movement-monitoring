import type { AppData, MovementPoint, TripSession, User } from "../types";
import { pendingCloudJobs, type CloudChange } from "./cloudChanges";
import { getFirebaseServices } from "./firebaseClient";

export type MonitoringSnapshot =
  | { key: "users"; collection: "users"; records: User[]; removed: string[] }
  | { key: "trips"; collection: "trip_sessions"; records: TripSession[]; removed: string[] }
  | { key: "points"; collection: "movement_records"; records: MovementPoint[]; removed: string[] };

export function mergeMonitoringSnapshot(data: AppData, snapshot: MonitoringSnapshot, pending: CloudChange[]): AppData {
  const records = new Map<string, User | TripSession | MovementPoint>(data[snapshot.key].map((row) => [row.id, row]));
  for (const id of snapshot.removed) records.delete(id);
  for (const record of snapshot.records) records.set(record.id, record);
  for (const change of pending.filter((row) => row.collection === snapshot.collection)) {
    const current = records.get(change.id);
    if (change.kind === "delete") records.delete(change.id);
    else if (change.kind === "create" && !current) records.set(change.id, change.data as unknown as User | TripSession | MovementPoint);
    else if (current && change.kind === "update") {
      const next = { ...current, ...change.data } as unknown as Record<string, unknown>;
      change.remove.forEach((field) => { delete next[field]; });
      records.set(change.id, next as unknown as User | TripSession | MovementPoint);
    }
  }
  const next = [...records.values()];
  return JSON.stringify(next) === JSON.stringify(data[snapshot.key]) ? data : { ...data, [snapshot.key]: next };
}

export async function subscribeAdminMonitoring(actor: User, onChange: (snapshot: MonitoringSnapshot, pending: CloudChange[]) => void, onError: () => void) {
  const services = getFirebaseServices();
  const uid = services?.auth.currentUser?.uid;
  if (!services || !uid || actor.role !== "admin" || (actor.id !== uid && actor.authUid !== uid)) return () => {};
  const { collection, onSnapshot } = await import("firebase/firestore");
  const sources = [{ key: "users", collection: "users" }, { key: "trips", collection: "trip_sessions" }, { key: "points", collection: "movement_records" }] as const;
  const stops = sources.map((source) => onSnapshot(collection(services.db, source.collection), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    const changes = snapshot.docChanges();
    if (!changes.length) return;
    const records = changes.filter((change) => change.type !== "removed").map((change) => ({ ...change.doc.data(), id: change.doc.id, ...(source.key === "users" ? { password: "" } : {}) }));
    const removed = changes.filter((change) => change.type === "removed").map((change) => change.doc.id);
    onChange({ ...source, records, removed } as MonitoringSnapshot, pendingCloudJobs(actor).flatMap((job) => job.changes));
  }, onError));
  return () => stops.forEach((stop) => stop());
}
