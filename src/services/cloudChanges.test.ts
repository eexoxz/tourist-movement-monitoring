import { describe, expect, it } from "vitest";
import { buildCloudChanges } from "./cloudChanges";

describe("action-scoped cloud changes", () => {
  it("does not overwrite fields a device did not edit", () => {
    const before = { trip_sessions: [{ id: "trip", data: { id: "trip", userId: "alice", status: "active", label: "Old" } }] };
    const after = { trip_sessions: [{ id: "trip", data: { ...before.trip_sessions[0].data, label: "Renamed" } }] };
    expect(buildCloudChanges(before, after, new Set())).toEqual([{ collection: "trip_sessions", id: "trip", kind: "update", data: { label: "Renamed" }, remove: [] }]);
  });
  it("deletes only records removed from a snapshot the user actually had", () => {
    expect(buildCloudChanges({ movement_records: [{ id: "seen", data: {} }] }, { movement_records: [] }, new Set(["movement_records"]))).toEqual([{ collection: "movement_records", id: "seen", kind: "delete", data: {}, remove: [] }]);
    expect(buildCloudChanges({}, { movement_records: [] }, new Set(["movement_records"]))).toEqual([]);
  });
  it("skips unchanged records and automatic timestamp-only churn", () => {
    expect(buildCloudChanges({ users: [{ id: "alice", data: { name: "Alice", updatedAt: "old" } }] }, { users: [{ id: "alice", data: { name: "Alice", updatedAt: "new" } }] }, new Set())).toEqual([]);
  });
  it("captures intentional field removal but never deletes identity records", () => {
    expect(buildCloudChanges({ users: [{ id: "alice", data: { name: "Alice", passport: "old" } }] }, { users: [{ id: "alice", data: { name: "Alice" } }] }, new Set())[0].remove).toEqual(["passport"]);
    expect(buildCloudChanges({ users: [{ id: "alice", data: {} }] }, { users: [] }, new Set())).toEqual([]);
  });
});
