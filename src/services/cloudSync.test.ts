import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppData, User } from "../types";

const mock = vi.hoisted(() => ({
  currentUser: { uid: "alice" } as { uid: string } | null,
  documents: new Map<string, Record<string, unknown>>(), fail: false, failRead: false,
  queryReads: vi.fn(), changeSessionOnRead: false,
  listener: vi.fn(), transactionSizes: [] as number[],
}));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => ({ auth: { get currentUser() { return mock.currentUser; } }, db: {} }) }));
vi.mock("firebase/firestore", () => {
  const snapshot = (path: string) => ({ id: path.split("/").at(-1), exists: () => mock.documents.has(path), data: () => structuredClone(mock.documents.get(path)) });
  return {
    doc: (_db: unknown, name: string, id: string) => `${name}/${id}`,
    collection: (_db: unknown, name: string) => ({ name }), where: (field: string, op: string, value: string) => ({ field, op, value }),
    query: (source: { name: string }, filter: unknown) => ({ ...source, filter }),
    deleteField: () => "__delete_field__",
    runTransaction: async (_db: unknown, action: (tx: unknown) => Promise<void>) => {
      const writes: (() => void)[] = [];
      await action({
        get: async (path: string) => snapshot(path),
        set: (path: string, data: Record<string, unknown>) => writes.push(() => mock.documents.set(path, structuredClone(data))),
        delete: (path: string) => writes.push(() => mock.documents.delete(path)),
        update: (path: string, data: Record<string, unknown>) => writes.push(() => {
          const next = { ...mock.documents.get(path), ...data };
          for (const key of Object.keys(next)) if (next[key] === "__delete_field__") delete next[key];
          mock.documents.set(path, next);
        }),
      });
      if (mock.fail) throw new Error("offline");
      mock.transactionSizes.push(writes.length);
      writes.forEach((write) => write());
    },
    getDocFromServer: async (path: string) => { if (mock.failRead) throw new Error("read denied"); return snapshot(path); },
    getDocsFromServer: async (source: { name: string; filter?: { value: string } }) => {
      mock.queryReads(source);
      if (mock.failRead) throw new Error("read denied");
      if (mock.changeSessionOnRead) mock.currentUser = null;
      return { docs: [...mock.documents.entries()].filter(([path, data]) => path.startsWith(`${source.name}/`) && (!source.filter || data.userId === source.filter.value)).map(([path]) => snapshot(path)) };
    },
    onSnapshot: mock.listener,
  };
});
import { cacheLocalData, loadCloudData, loadData, normalizeAppData, saveCloudData, saveData, subscribeIncidentReports } from "./storage";
import { acknowledgeCloudJob, pendingCloudJobs, queueCloudChanges } from "./cloudChanges";
import { mergeIncidentReports } from "./incidentSync";
import { loadPendingCheckIns, rememberPendingCheckIn } from "./pendingCheckIns";
import { getPreparedDemoTouristCount, initialData, mergePreparedDemoDataset, removeGeneratedDemoDataset } from "../data/demoData";
import { rememberDemoDatasetSelection } from "./demoDatasetSelection";
import { demoDatasetCountries, previewDemoDataset, replaceDemoDataset } from "./demoDataset";

const alice = { id: "alice", authUid: "alice", role: "tourist", name: "Alice", email: "alice@example.test", password: "", createdAt: "2026-10-17T00:00:00Z" } as User;
const trip = { id: "trip", userId: "alice", status: "active", label: "Original", startedAt: "2026-10-17T00:00:00Z" };
const base = () => normalizeAppData({ users: [alice], trips: [trip as AppData["trips"][number]] });

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });
  mock.currentUser = { uid: "alice" }; mock.documents.clear(); mock.fail = false; mock.failRead = false; mock.changeSessionOnRead = false; mock.transactionSizes = [];
  vi.clearAllMocks();
  mock.documents.set("users/alice", { ...alice });
  mock.documents.set("trip_sessions/trip", { ...trip });
  cacheLocalData(base());
});
afterEach(() => { for (const job of pendingCloudJobs(alice)) acknowledgeCloudJob(job); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("scoped cloud workflow persistence", () => {
  it("keeps a quota-exceeding cloud history in session and still queues genuine changes durably", async () => {
    const before = base();
    const originalWrite = localStorage.setItem;
    const write = vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === "tourist-movement-monitoring:data") throw new DOMException("Cache full", "QuotaExceededError");
      originalWrite(key, value);
    });
    try {
      const next = { ...before, points: [{ id: "new-point", tripId: "trip", userId: "alice", latitude: 5.4, longitude: 100.3, accuracyMeters: 20, source: "browser" as const, recordedAt: "2026-10-28T00:00:00Z" }] };
      cacheLocalData(next);
      expect(loadData().points).toEqual(next.points);
      expect(localStorage.getItem("tourist-movement-monitoring:data")).toBeNull();
      mock.fail = true;
      await expect(saveData(next, alice, before)).rejects.toThrow("offline");
      expect(pendingCloudJobs(alice).some((job) => job.changes.some((change) => change.id === "new-point"))).toBe(true);
      expect(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).some((key) => key?.startsWith("tourist-movement-monitoring:cloud-job:"))).toBe(true);
      expect(loadData().points).toEqual(next.points);
      expect(write.mock.calls.filter(([key]) => key === "tourist-movement-monitoring:data")).toHaveLength(1);
    } finally { write.mockRestore(); }
  });
  it("never uploads selected samples or deletes genuine cloud history during sample replacement", async () => {
    const admin = { ...alice, id: "admin", authUid: "admin", role: "admin" as const };
    mock.currentUser = { uid: admin.id };
    mock.documents.set("users/admin", admin);
    const before = { ...base(), users: [alice, admin] };
    const documents = structuredClone([...mock.documents]);
    const selected = previewDemoDataset(before, { countries: demoDatasetCountries, preference: "all", limit: 100 });
    const loaded = replaceDemoDataset(before, selected.userIds);
    expect(getPreparedDemoTouristCount(loaded)).toBe(100);
    expect(await saveCloudData(loaded, admin, before)).toBe(true);
    expect([...mock.documents]).toEqual(documents);
    const removed = replaceDemoDataset(loaded, new Set());
    expect(await saveCloudData(removed, admin, loaded)).toBe(true);
    expect([...mock.documents]).toEqual(documents);
    expect(pendingCloudJobs(admin)).toEqual([]);
  });
  it("does not resurrect removed cloud samples at sign-in or delete genuine remote history", async () => {
    const admin = { ...alice, id: "admin", authUid: "admin", role: "admin" as const };
    mock.currentUser = { uid: admin.id };
    mock.documents.set("users/admin", admin);
    const generated = initialData.users.filter((row) => row.id.startsWith("tourist-seed-"));
    for (const user of generated) mock.documents.set(`users/${user.id}`, { ...user });
    const sampleTrip = initialData.trips.find((row) => row.userId === generated[0].id)!;
    mock.documents.set(`trips/${sampleTrip.id}`, { ...sampleTrip });
    const point = initialData.points.find((row) => row.tripId === sampleTrip.id)!;
    mock.documents.set(`movementPoints/${point.id}`, { ...point, userId: undefined });
    const before = structuredClone([...mock.documents]);
    const cleaned = removeGeneratedDemoDataset(initialData);
    rememberDemoDatasetSelection(cleaned);
    const loaded = await loadCloudData(admin);
    expect(getPreparedDemoTouristCount(loaded!)).toBe(0);
    expect(loaded!.points).toEqual([]);
    expect(loaded!.trips.some((row) => row.userId === alice.id)).toBe(true);
    rememberDemoDatasetSelection(mergePreparedDemoDataset(cleaned));
    expect(getPreparedDemoTouristCount((await loadCloudData(admin))!)).toBe(20);
    expect([...mock.documents]).toEqual(before);
  });
  it("does not reopen or unhide an archived trip when another device sends a stale rename", async () => {
    const before = base();
    mock.documents.set("trip_sessions/trip", { ...trip, hiddenFromHistoryAt: "2026-10-22T01:00:00Z", endedAt: "2026-10-22T01:00:00Z", status: "completed" });
    await saveData({ ...before, trips: [{ ...before.trips[0], label: "Late rename" }] }, alice, before);
    expect(mock.documents.get("trip_sessions/trip")).toMatchObject({ hiddenFromHistoryAt: "2026-10-22T01:00:00Z", status: "completed", endedAt: "2026-10-22T01:00:00Z", label: "Late rename" });
  });
  it("saves completion back to the legacy trip instead of silently losing the update", async () => {
    const before = base();
    mock.documents.delete("trip_sessions/trip");
    mock.documents.set("trips/trip", { ...trip });
    await saveData({ ...before, trips: [{ ...before.trips[0], status: "completed", endedAt: "2026-10-21T01:00:00Z" }] }, alice, before);
    expect(mock.documents.get("trips/trip")).toMatchObject({ status: "completed", endedAt: "2026-10-21T01:00:00Z" });
    expect(mock.documents.has("trip_sessions/trip")).toBe(false);
    expect(pendingCloudJobs(alice)).toHaveLength(0);
  });
  it("merges modern and legacy route history with modern rows winning duplicate IDs", async () => {
    mock.documents.set("trips/trip", { ...trip, status: "completed" });
    mock.documents.set("trips/old-route", { ...trip, id: "old-route", status: "completed" });
    mock.documents.set("movementPoints/old-point", { id: "old-point", userId: "alice", tripId: "old-route", latitude: 5.25, longitude: 100.45, accuracyMeters: 15, source: "browser", recordedAt: "2026-10-17T00:00:00Z" });
    const loaded = await loadCloudData(alice);
    expect(loaded?.trips.filter(row => row.id === "trip")).toHaveLength(1);
    expect(loaded?.trips.find(row => row.id === "trip")?.status).toBe("active");
    expect(loaded?.trips.find(row => row.id === "old-route")?.status).toBe("completed");
    expect(loaded?.points.some(row => row.id === "old-point")).toBe(true);
  });
  it("deletes both copies of the same trip so a legacy duplicate cannot reappear", async () => {
    const before = base();
    mock.documents.set("trips/trip", { ...trip });
    await saveData({ ...before, trips: [] }, alice, before);
    expect(mock.documents.has("trip_sessions/trip")).toBe(false);
    expect(mock.documents.has("trips/trip")).toBe(false);
  });
  it("keeps mixed-owner admin changes within the deletion-lock rule lookup budget", async () => {
    mock.currentUser = { uid: "admin" };
    const admin = { ...alice, id: "admin", authUid: "admin", role: "admin" as const };
    const before = normalizeAppData({ users: [admin], recommendations: [] });
    const recommendations = Array.from({ length: 31 }, (_, index) => ({ id: `recommendation-${index}`, userId: `owner-${index}`, destinationId: "temple", score: 1 })) as AppData["recommendations"];
    await saveData({ ...before, recommendations }, admin, before);
    expect(mock.transactionSizes).toEqual([15, 15, 1]);
    expect(mock.documents.has("recommendations/recommendation-30")).toBe(true);
  });
  it("never uploads local sample identities or their refreshed recommendations", async () => {
    mock.currentUser = { uid: "admin" };
    const admin = { ...alice, id: "admin", authUid: "admin", role: "admin" as const };
    const before = normalizeAppData({ users: [admin], recommendations: [] });
    const after = { ...before, users: [...before.users, { ...alice, id: "tourist-seed-001" }], recommendations: [{ id: "sample-recommendation", userId: "tourist-seed-001", destinationId: "temple", score: 1 }] as AppData["recommendations"] };
    await saveData(after, admin, before);
    expect(mock.documents.has("users/tourist-seed-001")).toBe(false);
    expect(mock.documents.has("recommendations/sample-recommendation")).toBe(false);
    expect(pendingCloudJobs(admin)).toHaveLength(0);
  });
  it("retries a QR check-in through the global sync button's save path", async () => {
    const record = { id: "qr-visit", userId: "alice", destinationId: "temple", status: "checked-in" as const, checkedInAt: "2026-10-17T10:00:00Z" };
    rememberPendingCheckIn(record);
    expect(await saveCloudData(base(), alice)).toBe(true);
    expect(mock.documents.get("attraction_checkins/qr-visit")).toMatchObject(record);
    expect(loadPendingCheckIns("alice")).toEqual([]);
  });
  it("renames one trip without reverting a phone's completed status or deleting unseen records", async () => {
    const before = base();
    mock.documents.set("trip_sessions/trip", { ...trip, status: "completed", endedAt: "phone-stop" });
    mock.documents.set("trip_sessions/phone-only", { ...trip, id: "phone-only" });
    mock.documents.set("movement_records/phone-point", { id: "phone-point", userId: "alice", tripId: "phone-only" });
    expect(await saveData({ ...before, trips: before.trips.map((row) => ({ ...row, label: "Renamed" })) }, alice, before)).toBe(true);
    expect(mock.documents.get("trip_sessions/trip")).toMatchObject({ label: "Renamed", status: "completed", endedAt: "phone-stop" });
    expect(mock.documents.has("trip_sessions/phone-only")).toBe(true);
    expect(mock.documents.has("movement_records/phone-point")).toBe(true);
    expect(mock.queryReads).not.toHaveBeenCalled();
    expect(pendingCloudJobs(alice)).toHaveLength(0);
  });
  it("deletes only the trip actually removed, not every cloud trip absent from this device", async () => {
    mock.documents.set("trip_sessions/phone-only", { ...trip, id: "phone-only" });
    await saveData({ ...base(), trips: [] }, alice, base());
    expect(mock.documents.has("trip_sessions/trip")).toBe(false);
    expect(mock.documents.has("trip_sessions/phone-only")).toBe(true);
  });
  it("keeps failed changes for retry and does not replace newer unrelated fields", async () => {
    mock.fail = true;
    const before = base();
    await expect(saveData({ ...before, trips: [{ ...before.trips[0], label: "Offline edit" }] }, alice, before)).rejects.toThrow("offline");
    expect(pendingCloudJobs(alice)).toHaveLength(1);
    expect(loadData().trips[0].label).toBe("Offline edit");
    mock.documents.set("trip_sessions/trip", { ...trip, status: "completed" });
    mock.fail = false;
    await saveCloudData(loadData(), alice);
    expect(mock.documents.get("trip_sessions/trip")).toMatchObject({ label: "Offline edit", status: "completed" });
    expect(pendingCloudJobs(alice)).toHaveLength(0);
  });
  it("preserves action order for rapid edits in the same millisecond", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-17T00:00:00Z"));
    const before = base();
    const first = { ...before, trips: [{ ...before.trips[0], label: "First" }] };
    const second = { ...before, trips: [{ ...before.trips[0], label: "Second" }] };
    await Promise.all([saveData(first, alice, before), saveData(second, alice, first)]);
    expect(mock.documents.get("trip_sessions/trip")?.label).toBe("Second");
  });
  it("does not recreate a remotely deleted trip from a delayed rename", async () => {
    mock.documents.delete("trip_sessions/trip");
    const before = base();
    await saveData({ ...before, trips: [{ ...before.trips[0], label: "Late" }] }, alice, before);
    expect(mock.documents.has("trip_sessions/trip")).toBe(false);
  });
  it("cannot flush another user's pending actions after an account switch", async () => {
    queueCloudChanges("alice", [{ collection: "trip_sessions", id: "trip", kind: "delete", data: {}, remove: [] }]);
    mock.currentUser = { uid: "bob" };
    expect(await saveCloudData(base(), alice)).toBe(false);
    expect(mock.documents.has("trip_sessions/trip")).toBe(true);
    expect(pendingCloudJobs(alice)).toHaveLength(1);
  });
  it("never sends another tourist's cached changes through a tourist save", async () => {
    const before = base();
    await saveData({ ...before, trips: [...before.trips, { ...before.trips[0], id: "bob-trip", userId: "bob" }] }, alice, before);
    expect(mock.documents.has("trip_sessions/bob-trip")).toBe(false);
  });
  it("retries pending writes before replacing the local cache with a cloud refresh", async () => {
    mock.fail = true;
    const before = base();
    await saveData({ ...before, trips: [{ ...before.trips[0], label: "Local draft" }] }, alice, before).catch(() => undefined);
    mock.fail = false;
    const result = await loadCloudData(alice);
    expect(result?.trips[0].label).toBe("Local draft");
    expect(loadData().trips[0].label).toBe("Local draft");
  });
  it("retains local records and reports failure rather than treating failed reads as empty data", async () => {
    mock.failRead = true;
    await expect(loadCloudData(alice)).rejects.toThrow("read denied");
    expect(loadData().trips).toHaveLength(1);
    expect(mock.documents.size).toBe(2);
  });
  it("ignores a cloud refresh completed after sign-out", async () => {
    mock.changeSessionOnRead = true;
    expect(await loadCloudData(alice)).toBeNull();
    expect(loadData().trips).toHaveLength(1);
  });
  it("does not overwrite the cache when the same account starts a newer session", async () => {
    expect(await loadCloudData(alice, () => false)).toBeNull();
    expect(loadData().trips).toHaveLength(1);
  });
  it("does not use a locally cached admin role to read all users", async () => {
    await loadCloudData({ ...alice, role: "admin" });
    expect(mock.queryReads.mock.calls.filter(([source]) => source.name === "trip_sessions")[0][0].filter.value).toBe("alice");
    expect(mock.queryReads.mock.calls.some(([source]) => source.name === "users")).toBe(false);
  });
  it("delivers incident updates only from acknowledged snapshots and scopes the tourist query", async () => {
    const stop = vi.fn(); mock.listener.mockReturnValue(stop);
    const change = vi.fn();
    expect(await subscribeIncidentReports(alice, change, vi.fn())).toBe(stop);
    const [source, , callback] = mock.listener.mock.calls[0];
    expect(source.filter.value).toBe("alice");
    callback({ metadata: { fromCache: true }, docs: [] });
    expect(change).not.toHaveBeenCalled();
    callback({ metadata: {}, docs: [{ id: "report", data: () => ({ userId: "alice", status: "resolved", updatedAt: "2026-10-17T10:00:00Z" }) }] });
    expect(change).toHaveBeenCalledWith([expect.objectContaining({ id: "report", status: "resolved" })]);
    const report = change.mock.calls[0][0][0];
    expect(mergeIncidentReports([{ ...report, status: "reviewing", updatedAt: "2026-10-17T09:00:00Z" }], [report])[0].status).toBe("resolved");
  });
});
