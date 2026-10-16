import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AttractionCheckIn } from "../types";
import { acknowledgePendingCheckIn, loadPendingCheckIns, pendingCheckInsKey, rememberPendingCheckIn } from "./pendingCheckIns";
import { mergeCheckInRecords } from "./checkInSync";

const record: AttractionCheckIn = { id: "visit", userId: "tourist", destinationId: "temple", status: "checked-in", checkedInAt: "2026-10-17T00:00:00Z" };
let saved: Map<string, string>;
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) });
});
afterEach(() => vi.unstubAllGlobals());

describe("pending QR visit recovery", () => {
  it("recovers the same visit after an empty cloud refresh and deduplicates retries", () => {
    rememberPendingCheckIn(record);
    rememberPendingCheckIn(record);
    expect(mergeCheckInRecords(loadPendingCheckIns("tourist"), [])).toEqual([record]);
    expect(loadPendingCheckIns("other")).toEqual([]);
    acknowledgePendingCheckIn(record);
    expect(loadPendingCheckIns("tourist")).toEqual([]);
  });
  it("does not lose another owner's pending visit on acknowledgement", () => {
    rememberPendingCheckIn(record);
    acknowledgePendingCheckIn({ ...record, userId: "other" });
    expect(loadPendingCheckIns("tourist")).toEqual([record]);
  });
  it("keeps a pending checkout until the server confirms checkout", () => {
    const closed: AttractionCheckIn = { ...record, status: "checked-out", checkedOutAt: "2026-10-17T01:00:00Z" };
    rememberPendingCheckIn(closed);
    acknowledgePendingCheckIn(record);
    expect(loadPendingCheckIns("tourist")).toEqual([closed]);
    acknowledgePendingCheckIn(closed);
    expect(loadPendingCheckIns("tourist")).toEqual([]);
  });
  it("never queues synthetic visits", () => {
    rememberPendingCheckIn({ ...record, isDemo: true });
    expect(loadPendingCheckIns("tourist")).toEqual([]);
  });
  it.each(["null", "{}", "broken", '[{"id":"visit"}]'])("ignores invalid pending storage: %s", (value) => {
    saved.set(pendingCheckInsKey, value);
    expect(loadPendingCheckIns("tourist")).toEqual([]);
  });
  it("still permits online saves when browser storage is blocked", () => {
    vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } });
    expect(() => rememberPendingCheckIn(record)).not.toThrow();
    expect(() => acknowledgePendingCheckIn(record)).not.toThrow();
  });
});
