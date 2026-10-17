import type { User } from "../types";

export type CloudDocument = { id: string; data: Record<string, unknown> };
export type CloudTables = Record<string, CloudDocument[]>;
export type CloudChange = { collection: string; id: string; kind: "create" | "update" | "delete"; data: Record<string, unknown>; remove: string[] };
export type CloudJob = { id: string; userId: string; changes: CloudChange[] };
const pending = new Map<string, CloudJob>();
const prefix = "tourist-movement-monitoring:cloud-job:";
const keyFor = (job: CloudJob) => `${prefix}${job.userId}:${job.id}`;
let lastQueuedAt = 0;

export function buildCloudChanges(before: CloudTables, after: CloudTables, deletable: Set<string>): CloudChange[] {
  const changes: CloudChange[] = [];
  for (const [collection, rows] of Object.entries(after)) {
    const previous = new Map((before[collection] ?? []).map((row) => [row.id, row.data]));
    for (const row of rows) {
      const previousRow = previous.get(row.id);
      previous.delete(row.id);
      if (previousRow === row.data) continue;
      const current = JSON.parse(JSON.stringify(row.data)) as Record<string, unknown>;
      if (!previousRow) { changes.push({ collection, id: row.id, kind: "create", data: current, remove: [] }); continue; }
      const old = JSON.parse(JSON.stringify(previousRow)) as Record<string, unknown>;
      const data = Object.fromEntries(Object.entries(current).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(old[field])));
      const remove = Object.keys(old).filter((field) => !(field in current));
      if (Object.keys(data).some((field) => field !== "updatedAt") || remove.length) changes.push({ collection, id: row.id, kind: "update", data, remove });
    }
    if (deletable.has(collection)) for (const [id] of previous) changes.push({ collection, id, kind: "delete", data: {}, remove: [] });
  }
  return changes;
}

export function queueCloudChanges(userId: string, changes: CloudChange[]) {
  if (!changes.length) return;
  lastQueuedAt = Math.max(Date.now(), lastQueuedAt + 1);
  const job: CloudJob = { id: `${lastQueuedAt.toString().padStart(13, "0")}-${crypto.randomUUID()}`, userId, changes: JSON.parse(JSON.stringify(changes)) as CloudChange[] };
  try { localStorage.setItem(keyFor(job), JSON.stringify(job)); }
  catch { pending.set(keyFor(job), job); }
  return job;
}

export function pendingCloudJobs(actor: Pick<User, "id">) {
  const jobs = new Map(pending);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${prefix}${actor.id}:`)) continue;
      try {
        const job = JSON.parse(localStorage.getItem(key) ?? "null") as CloudJob | null;
        if (job && job.userId === actor.id && typeof job.id === "string" && key === keyFor(job) && Array.isArray(job.changes) && job.changes.every((change) => typeof change.collection === "string" && typeof change.id === "string" && ["create", "update", "delete"].includes(change.kind) && change.data && Array.isArray(change.remove) && change.remove.every((field) => typeof field === "string"))) jobs.set(key, job);
      } catch { /* A malformed local entry must not stop valid jobs. */ }
    }
  } catch { /* Browser storage can be blocked. */ }
  return [...jobs.values()].filter((job) => job.userId === actor.id).sort((a, b) => a.id.localeCompare(b.id));
}

export function acknowledgeCloudJob(job: CloudJob) {
  pending.delete(keyFor(job));
  try { localStorage.removeItem(keyFor(job)); } catch { /* Replays remain idempotent if a stale entry is retained. */ }
}
