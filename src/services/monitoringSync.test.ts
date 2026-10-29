import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../types";
import { normalizeAppData } from "./storage";

const mock = vi.hoisted(() => ({ uid: "admin", listen: vi.fn(), stops: [vi.fn(), vi.fn(), vi.fn()] }));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => ({ auth: { get currentUser() { return { uid: mock.uid }; } }, db: {} }) }));
vi.mock("firebase/firestore", () => ({ collection: (_db: unknown, name: string) => ({ name }), documentId: () => "__name__", or: (...clauses: unknown[]) => ({ clauses }), where: (field: string, op: string, value: string) => ({ field, op, value }), query: (source: object, filter: unknown) => ({ ...source, filter }), onSnapshot: mock.listen }));
import { mergeMonitoringSnapshot, subscribeAdminMonitoring } from "./monitoringSync";

describe("live admin movement monitoring", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mock.uid = "admin"; mock.stops.forEach((stop) => mock.listen.mockReturnValueOnce(stop)); });
  afterEach(() => vi.useRealTimers());
  it("subscribes to users, trips and movement and releases all listeners", async () => {
    const change = vi.fn();
    const stop = await subscribeAdminMonitoring({ id: "admin", role: "admin" } as User, change, vi.fn());
    expect(mock.listen.mock.calls.map(([source]) => source.name)).toEqual(["users", "trip_sessions", "movement_records"]);
    expect(mock.listen.mock.calls[2][0].filter.clauses).toEqual([{ field: "userId", op: "<", value: "tourist-seed-" }, { field: "userId", op: ">=", value: "tourist-seed." }]);
    const receive = mock.listen.mock.calls[2][2];
    const changes = [{ type: "added", doc: { id: "point", data: () => ({ userId: "alice", tripId: "trip", latitude: 5.4, longitude: 100.3 }) } }];
    receive({ metadata: { fromCache: true }, docChanges: () => changes });
    expect(change).not.toHaveBeenCalled();
    receive({ metadata: {}, docChanges: () => changes });
    expect(change).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(change).toHaveBeenCalledWith([expect.objectContaining({ key: "points", records: [expect.objectContaining({ id: "point", userId: "alice" })] })], []);
    stop(); mock.stops.forEach((cleanup) => expect(cleanup).toHaveBeenCalledOnce());
  });
  it("coalesces bursts across collections and keeps the final change for each document", async () => {
    const change = vi.fn();
    const stop = await subscribeAdminMonitoring({ id: "admin", role: "admin" } as User, change, vi.fn());
    const receive = (source: number, type: string, id: string, value: string) => mock.listen.mock.calls[source][2]({ metadata: {}, docChanges: () => [{ type, doc: { id, data: () => ({ label: value }) } }] });
    receive(2, "added", "point", "old");
    receive(2, "modified", "point", "new");
    receive(2, "removed", "deleted", "gone");
    receive(1, "added", "trip", "trip");
    receive(0, "added", "user", "user");
    vi.advanceTimersByTime(100);
    expect(change).toHaveBeenCalledOnce();
    expect(change.mock.calls[0][0]).toEqual([
      expect.objectContaining({ key: "points", records: [{ id: "point", label: "new" }], removed: ["deleted"] }),
      expect.objectContaining({ key: "trips", records: [{ id: "trip", label: "trip" }] }),
      expect.objectContaining({ key: "users", records: [{ id: "user", label: "user", password: "" }] }),
    ]);
    stop();
  });
  it.each(["stop", "sign-out"])("discards buffered updates on %s", async (reason) => {
    const change = vi.fn();
    const stop = await subscribeAdminMonitoring({ id: "admin", role: "admin" } as User, change, vi.fn());
    mock.listen.mock.calls[2][2]({ metadata: {}, docChanges: () => [{ type: "added", doc: { id: "point", data: () => ({}) } }] });
    if (reason === "stop") stop(); else mock.uid = "other";
    vi.advanceTimersByTime(100);
    expect(change).not.toHaveBeenCalled();
    if (reason !== "stop") stop();
  });
  it("retains references on duplicate updates and when pending overlays cancel a server change", () => {
    const data = normalizeAppData({ trips: [{ id: "trip", userId: "alice", label: "Pending", status: "active" }] as never });
    const snapshot = { key: "trips" as const, collection: "trip_sessions" as const, records: [{ ...data.trips[0] }], removed: [] };
    expect(mergeMonitoringSnapshot(data, snapshot, [])).toBe(data);
    expect(mergeMonitoringSnapshot(data, { ...snapshot, records: [{ ...data.trips[0], label: "Old" }] }, [{ collection: "trip_sessions", id: "trip", kind: "update", data: { label: "Pending" }, remove: [] }])).toBe(data);
  });
  it("updates one row without replacing unchanged rows or losing large histories", () => {
    const points = Array.from({ length: 30000 }, (_, index) => ({ id: `point-${index}`, userId: "alice", tripId: "trip", latitude: 5.4, longitude: 100.3, source: "browser", recordedAt: "2026-10-17T00:00:00Z" }));
    const data = normalizeAppData({ points } as never);
    const last = { ...data.points.at(-1)!, latitude: 5.5 };
    const next = mergeMonitoringSnapshot(data, { key: "points", collection: "movement_records", records: [last], removed: [] }, []);
    expect(next.points).toHaveLength(30000);
    expect(next.points[0]).toBe(data.points[0]);
    expect(next.points.at(-1)).toEqual(last);
    expect(next.trips).toBe(data.trips);
  });
  it("never starts broad monitoring for tourists or mismatched sessions", async () => {
    await subscribeAdminMonitoring({ id: "admin", role: "tourist" } as User, vi.fn(), vi.fn());
    await subscribeAdminMonitoring({ id: "other", role: "admin" } as User, vi.fn(), vi.fn());
    expect(mock.listen).not.toHaveBeenCalled();
  });
  it("merges incremental movement changes without removing the local demo dataset", () => {
    const data = normalizeAppData({ points: [{ id: "demo", tripId: "demo-trip", userId: "demo" }, { id: "removed", tripId: "trip", userId: "alice" }] as never });
    const next = mergeMonitoringSnapshot(data, { key: "points", collection: "movement_records", records: [{ id: "new", userId: "alice", tripId: "trip", latitude: 5.4, longitude: 100.3 }] as never, removed: ["removed"] }, []);
    expect(next.points.map((row) => row.id)).toEqual(["demo", "new"]);
  });
  it("preserves queued edits while applying a server status update", () => {
    const data = normalizeAppData({ trips: [{ id: "trip", userId: "alice", label: "My pending rename", status: "active" }] as never });
    const next = mergeMonitoringSnapshot(data, { key: "trips", collection: "trip_sessions", records: [{ ...data.trips[0], label: "Old", status: "completed" }], removed: [] }, [{ collection: "trip_sessions", id: "trip", kind: "update", data: { label: "My pending rename" }, remove: [] }]);
    expect(next.trips[0]).toMatchObject({ label: "My pending rename", status: "completed" });
  });
});
