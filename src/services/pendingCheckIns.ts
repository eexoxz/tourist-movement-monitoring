import type { AttractionCheckIn } from "../types";

export const pendingCheckInsKey = "tourist-movement-monitoring:pending-checkins";

function readPending(): AttractionCheckIn[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(pendingCheckInsKey) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((record): record is AttractionCheckIn => Boolean(
      record && typeof record === "object" && typeof record.id === "string" &&
      typeof record.userId === "string" && typeof record.destinationId === "string" &&
      typeof record.checkedInAt === "string" && Number.isFinite(Date.parse(record.checkedInAt)) &&
      ["checked-in", "checked-out"].includes(record.status) && !record.isDemo
    ));
  } catch {
    return [];
  }
}

function writePending(records: AttractionCheckIn[]) {
  try {
    if (records.length) localStorage.setItem(pendingCheckInsKey, JSON.stringify(records));
    else localStorage.removeItem(pendingCheckInsKey);
  } catch {
    // Storage restrictions must not prevent an online check-in.
  }
}

export const loadPendingCheckIns = (userId: string) => readPending().filter((record) => record.userId === userId);

export function rememberPendingCheckIn(record: AttractionCheckIn) {
  if (!record.isDemo) writePending([...readPending().filter((saved) => saved.id !== record.id), record]);
}

export function acknowledgePendingCheckIns(records: AttractionCheckIn[]) {
  const pending = readPending();
  if (!pending.length) return;
  const remote = new Map(records.map((record) => [record.id, record]));
  const remaining = pending.filter((saved) => {
    const record = remote.get(saved.id);
    return !record || saved.userId !== record.userId || (saved.status === "checked-out" && record.status !== "checked-out");
  });
  if (remaining.length !== pending.length) writePending(remaining);
}

export const acknowledgePendingCheckIn = (record: AttractionCheckIn) => acknowledgePendingCheckIns([record]);
