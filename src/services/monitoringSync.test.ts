import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../types";
import { normalizeAppData } from "./storage";

const mock = vi.hoisted(() => ({ uid: "admin", listen: vi.fn(), stops: [vi.fn(), vi.fn(), vi.fn()] }));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => ({ auth: { currentUser: { uid: mock.uid } }, db: {} }) }));
vi.mock("firebase/firestore", () => ({ collection: (_db: unknown, name: string) => ({ name }), onSnapshot: mock.listen }));
import { mergeMonitoringSnapshot, subscribeAdminMonitoring } from "./monitoringSync";

describe("live admin movement monitoring", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.uid = "admin"; mock.stops.forEach((stop) => mock.listen.mockReturnValueOnce(stop)); });
  it("subscribes to users, trips and movement and releases all listeners", async () => {
    const change = vi.fn();
    const stop = await subscribeAdminMonitoring({ id: "admin", role: "admin" } as User, change, vi.fn());
    expect(mock.listen.mock.calls.map(([source]) => source.name)).toEqual(["users", "trip_sessions", "movement_records"]);
    const receive = mock.listen.mock.calls[2][2];
    const changes = [{ type: "added", doc: { id: "point", data: () => ({ userId: "alice", tripId: "trip", latitude: 5.4, longitude: 100.3 }) } }];
    receive({ metadata: { fromCache: true }, docChanges: () => changes });
    expect(change).not.toHaveBeenCalled();
    receive({ metadata: {}, docChanges: () => changes });
    expect(change).toHaveBeenCalledWith(expect.objectContaining({ key: "points", records: [expect.objectContaining({ id: "point", userId: "alice" })] }), []);
    stop(); mock.stops.forEach((cleanup) => expect(cleanup).toHaveBeenCalledOnce());
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
