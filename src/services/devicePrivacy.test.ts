import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialData } from "../data/demoData";
import { queueCloudChanges, acknowledgeCloudJob, hasPendingCloudChanges } from "./cloudChanges";
import { clearDownloadedDeviceData, hasUnsyncedDeviceWork, UnsyncedDeviceWork } from "./devicePrivacy";
import { createItinerary } from "./itineraries";
import { pendingCheckInsKey } from "./pendingCheckIns";
import { cacheLocalData, clearSession, loadData, saveSession } from "./storage";

const dataKey = "tourist-movement-monitoring:data";
const planKey = "tourist-movement-monitoring:itineraries:other-owner";
let saved: Map<string, string>;
beforeEach(() => {
  saved = new Map();
  const storage = { get length() { return saved.size; }, key: (index: number) => [...saved.keys()][index] ?? null, getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  saveSession("test"); clearSession();
});
afterEach(() => { saveSession("test"); clearSession(); vi.unstubAllGlobals(); });

describe("explicit shared-device cleanup", () => {
  it("clears only downloaded private copies and prevents late cache writes before reload", () => {
    cacheLocalData(initialData);
    saved.set(planKey, JSON.stringify([{ dirty: false, plan: createItinerary("other-owner", "Saved plan") }]));
    const privateKeys = ["tourist-movement-monitoring:remember-login", "tourist-movement-monitoring:last-location:alice", "tourist-movement-monitoring:profile-skip:alice"];
    privateKeys.forEach((key) => saved.set(key, "private"));
    saved.set("tourist-movement-monitoring:locale", "ja");
    saved.set("unrelated", "keep");
    expect(hasUnsyncedDeviceWork()).toBe(false);
    clearDownloadedDeviceData();
    for (const key of [dataKey, planKey, ...privateKeys]) expect(saved.has(key)).toBe(false);
    expect(saved.get("unrelated")).toBe("keep");
    expect(saved.get("tourist-movement-monitoring:locale")).toBe("ja");
    cacheLocalData(initialData);
    expect(saved.has(dataKey)).toBe(false);
    expect(loadData().users).toEqual([]);
    expect(loadData().points).toEqual([]);
    saveSession("new-authenticated-owner");
    cacheLocalData(initialData);
    expect(saved.has(dataKey)).toBe(true);
  });
  it.each([
    [planKey, JSON.stringify([{ dirty: true, plan: { title: "Unsaved draft" } }])],
    [planKey, "broken"], [planKey, "{}"], [planKey, '[{"dirty":false,"plan":{}}]'],
    [pendingCheckInsKey, '[{"id":"unsynced"}]'], [pendingCheckInsKey, "broken"], [pendingCheckInsKey, "null"],
    ["tourist-movement-monitoring:cloud-job:other:job", "broken"],
  ])("refuses removal for pending or unreadable work at %s (%s)", (key, value) => {
    saved.set(dataKey, "sensitive cached data");
    saved.set(key, value);
    const before = [...saved];
    expect(() => clearDownloadedDeviceData()).toThrow();
    expect([...saved]).toEqual(before);
  });
  it("checks queued jobs for every owner, including in-memory fallback", () => {
    const change = { collection: "trip_sessions", id: "trip", kind: "update" as const, data: { label: "Pending" }, remove: [] };
    const durable = queueCloudChanges("other-owner", [change])!;
    expect(hasPendingCloudChanges()).toBe(true);
    expect(() => clearDownloadedDeviceData()).toThrow(UnsyncedDeviceWork);
    acknowledgeCloudJob(durable);
    expect(hasPendingCloudChanges()).toBe(false);
    const realStorage = localStorage;
    vi.stubGlobal("localStorage", { ...realStorage, setItem() { throw new Error("quota"); } });
    const memory = queueCloudChanges("other-owner", [change])!;
    expect(hasUnsyncedDeviceWork()).toBe(true);
    acknowledgeCloudJob(memory);
    vi.stubGlobal("localStorage", realStorage);
    expect(hasUnsyncedDeviceWork()).toBe(false);
  });
  it("fails closed when browser storage cannot be inspected", () => {
    vi.stubGlobal("localStorage", { get length() { throw new Error("blocked"); } });
    expect(() => clearDownloadedDeviceData()).toThrow("blocked");
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  });
});
