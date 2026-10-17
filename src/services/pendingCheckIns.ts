import type { AttractionCheckIn } from "../types";

export const pendingCheckInsKey = "tourist-movement-monitoring:pending-checkins";
const fallback = new Map<string, AttractionCheckIn>();

function readPending(): AttractionCheckIn[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(pendingCheckInsKey) ?? "[]");
    if (!Array.isArray(value)) return [...fallback.values()];
    const stored = value.filter((record): record is AttractionCheckIn => Boolean(
      record && typeof record === "object" && typeof record.id === "string" &&
      typeof record.userId === "string" && typeof record.destinationId === "string" &&
      typeof record.checkedInAt === "string" && Number.isFinite(Date.parse(record.checkedInAt)) &&
      ["checked-in", "checked-out"].includes(record.status) && !record.isDemo
    ));
    return [...new Map([...stored, ...fallback.values()].map((record) => [record.id, record])).values()];
  } catch {
    return [...fallback.values()];
  }
}

function writePending(records: AttractionCheckIn[]) {
  try {
    if (records.length) localStorage.setItem(pendingCheckInsKey, JSON.stringify(records));
    else localStorage.removeItem(pendingCheckInsKey);
    return true;
  } catch {
    // Storage restrictions must not prevent an online check-in.
    return false;
  }
}

export const loadPendingCheckIns = (userId: string) => readPending().filter((record) => record.userId === userId);

export function rememberPendingCheckIn(record: AttractionCheckIn) {
  if (!record.isDemo) {
    if (writePending([...readPending().filter((saved) => saved.id !== record.id), record])) fallback.clear();
    else fallback.set(record.id, record);
  }
}

export const hasPendingCheckInChanges = () => readPending().length > 0;

export function acknowledgePendingCheckIns(records: AttractionCheckIn[]) {
  const pending = readPending();
  if (!pending.length) return;
  const remote = new Map(records.map((record) => [record.id, record]));
  const remaining = pending.filter((saved) => {
    const record = remote.get(saved.id);
    return !record || saved.userId !== record.userId || (saved.status === "checked-out" && record.status !== "checked-out");
  });
  if (remaining.length !== pending.length) {
    if (writePending(remaining)) fallback.clear();
    else {
      const remainingIds = new Set(remaining.map((record) => record.id));
      for (const id of fallback.keys()) if (!remainingIds.has(id)) fallback.delete(id);
    }
  }
}

export const acknowledgePendingCheckIn = (record: AttractionCheckIn) => acknowledgePendingCheckIns([record]);
