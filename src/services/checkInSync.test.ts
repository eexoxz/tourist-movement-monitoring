import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttractionCheckIn } from "../types";
import { confirmCheckInSync, mergeCheckInRecords } from "./checkInSync";
import { checkInSyncText } from "./checkInSyncCopy";
import type { Locale } from "./i18n";

const record: AttractionCheckIn = { id: "visit", userId: "tourist", destinationId: "temple", status: "checked-in", checkedInAt: "2026-10-17T00:00:00Z" };

describe("confirmed QR check-in sync", () => {
  afterEach(() => vi.useRealTimers());
  it("never calls a local demo a cloud save", async () => {
    const write = vi.fn();
    expect(await confirmCheckInSync(write, false)).toBe("local");
    expect(write).not.toHaveBeenCalled();
  });
  it("waits for the write acknowledgement", async () => {
    let resolve!: (saved: boolean) => void;
    const confirmed = vi.fn();
    const promise = confirmCheckInSync(() => new Promise<boolean>((done) => { resolve = done; }), true).then(confirmed);
    await Promise.resolve();
    expect(confirmed).not.toHaveBeenCalled();
    resolve(true);
    await promise;
    expect(confirmed).toHaveBeenCalledWith("synced");
  });
  it("keeps rejected and unavailable writes pending, not successful", async () => {
    expect(await confirmCheckInSync(async () => false, true)).toBe("pending");
    expect(await confirmCheckInSync(async () => { throw new Error("permission-denied"); }, true)).toBe("pending");
  });
  it("offers a bounded retry even when the network does not answer", async () => {
    vi.useFakeTimers();
    let resolve!: (saved: boolean) => void;
    const promise = confirmCheckInSync(() => new Promise<boolean>((done) => { resolve = done; }), true);
    await vi.advanceTimersByTimeAsync(12000);
    expect(await promise).toBe("pending");
    resolve(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears its timeout after a successful save", async () => {
    vi.useFakeTimers();
    expect(await confirmCheckInSync(async () => true, true)).toBe("synced");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("merges another device's visit without deleting unsynced local visits", () => {
    const local = { ...record, id: "local" };
    const merged = mergeCheckInRecords([local], [record]);
    expect(merged).toHaveLength(2);
    expect(merged).toContain(local);
    expect(mergeCheckInRecords(merged, [record])).toBe(merged);
  });
  it("receives a remote checkout and prevents stale snapshots reopening a local checkout", () => {
    const closed: AttractionCheckIn = { ...record, status: "checked-out", checkedOutAt: "2026-10-17T01:00:00Z" };
    expect(mergeCheckInRecords([record], [closed])).toEqual([closed]);
    expect(mergeCheckInRecords([closed], [record])).toEqual([closed]);
  });
  it("receives admin review fields without losing a pending local checkout", () => {
    const closed: AttractionCheckIn = { ...record, status: "checked-out", checkedOutAt: "2026-10-17T01:00:00Z" };
    expect(mergeCheckInRecords([closed], [{ ...record, reviewStatus: "linked", reviewedBy: "admin" }])).toEqual([{ ...closed, reviewStatus: "linked", reviewedBy: "admin" }]);
  });
  it("does not replace an existing record with another owner's ID collision", () => {
    const current = [record];
    expect(mergeCheckInRecords(current, [{ ...record, userId: "other" }])).toBe(current);
  });
  for (const locale of ["en", "ms", "zh", "ja", "ko", "pt", "ta", "es", "fr"] as Locale[]) it(`provides all QR sync actions and outcomes in ${locale}`, () => {
    for (const key of ["back", "saving", "retry", "pendingTitle", "pending", "synced", "localTitle", "local"] as const) {
      expect(checkInSyncText(locale, key).trim()).not.toBe("");
      if (locale !== "en") expect(checkInSyncText(locale, key)).not.toBe(checkInSyncText("en", key));
    }
  });
});
