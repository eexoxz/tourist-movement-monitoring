import type { AttractionCheckIn } from "../types";

export type CheckInSyncState = "synced" | "local" | "pending";

export async function confirmCheckInSync(write: () => Promise<boolean>, cloudConfigured: boolean, timeoutMs = 12000): Promise<CheckInSyncState> {
  if (!cloudConfigured) return "local";
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const saved = await Promise.race([
      write(),
      new Promise<boolean>((_, reject) => { timer = setTimeout(() => reject(new Error("Check-in sync timed out")), timeoutMs); }),
    ]);
    return saved ? "synced" : "pending";
  } catch {
    return "pending";
  } finally {
    clearTimeout(timer);
  }
}

export function mergeCheckInRecords(current: AttractionCheckIn[], remote: AttractionCheckIn[]) {
  const records = new Map(current.map((record) => [record.id, record]));
  let changed = false;
  for (const incoming of remote) {
    const existing = records.get(incoming.id);
    if (existing && existing.userId !== incoming.userId) continue;
    const next = existing?.status === "checked-out" && incoming.status === "checked-in"
      ? { ...incoming, status: existing.status, checkedOutAt: existing.checkedOutAt }
      : incoming;
    if (!existing || JSON.stringify(existing) !== JSON.stringify(next)) {
      changed = true;
      records.set(next.id, next);
    }
  }
  return changed ? Array.from(records.values()).sort((a, b) => Date.parse(b.checkedInAt) - Date.parse(a.checkedInAt)) : current;
}
