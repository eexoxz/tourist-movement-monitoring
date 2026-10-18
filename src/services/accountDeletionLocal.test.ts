import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDeletedAccountDeviceData } from "./accountDeletionLocal";
import { acknowledgeCloudJob, pendingCloudJobs, queueCloudChanges } from "./cloudChanges";
import { forgetAccountCheckIns, loadPendingCheckIns, pendingCheckInsKey, rememberPendingCheckIn } from "./pendingCheckIns";
import { clearSession, saveSession } from "./storage";

let values: Map<string, string>;
beforeEach(() => {
  values = new Map();
  const storage = { get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal("localStorage", storage); vi.stubGlobal("sessionStorage", storage); saveSession("alice");
});
afterEach(() => { for (const owner of ["alice", "bob"]) for (const job of pendingCloudJobs({ id: owner })) acknowledgeCloudJob(job); saveSession("test"); clearSession(); vi.unstubAllGlobals(); });
describe("deleted-account local cleanup", () => {
  it("removes only the deleted owner's recovery jobs and drafts", () => {
    for (const userId of ["alice", "bob"]) {
      queueCloudChanges(userId, [{ collection: "trip_sessions", id: userId, kind: "update", data: { label: "pending" }, remove: [] }]);
      rememberPendingCheckIn({ id: userId, userId, destinationId: "place", checkedInAt: "2026-10-18T00:00:00Z", status: "checked-in" });
      values.set(`tourist-movement-monitoring:itineraries:${userId}`, "draft");
      values.set(`tourist-movement-monitoring:last-location:${userId}`, "gps");
    }
    clearDeletedAccountDeviceData("alice");
    expect(pendingCloudJobs({ id: "alice" })).toEqual([]); expect(pendingCloudJobs({ id: "bob" })).toHaveLength(1);
    expect(loadPendingCheckIns("alice")).toEqual([]); expect(loadPendingCheckIns("bob")).toHaveLength(1);
    expect(values.has("tourist-movement-monitoring:itineraries:alice")).toBe(false);
    expect(values.get("tourist-movement-monitoring:itineraries:bob")).toBe("draft");
    expect(values.get("tourist-movement-monitoring:last-location:bob")).toBe("gps");
  });
  it("preserves unrelated unknown recovery entries and fails closed on corrupt storage", () => {
    values.set(pendingCheckInsKey, JSON.stringify([{ userId: "alice" }, { unknown: true }, "unknown"]));
    forgetAccountCheckIns("alice");
    expect(JSON.parse(values.get(pendingCheckInsKey)!)).toEqual([{ unknown: true }, "unknown"]);
    values.set(pendingCheckInsKey, "broken");
    expect(() => forgetAccountCheckIns("alice")).toThrow();
    expect(values.get(pendingCheckInsKey)).toBe("broken");
  });
});
