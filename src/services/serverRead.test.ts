import { describe, expect, it, vi } from "vitest";
import { isCloudQuotaError, shareServerRead } from "./serverRead";
import { friendlyAuthError } from "./authError";

describe("simultaneous server reads", () => {
  it("shares one in-flight read but always refreshes after completion", async () => {
    const database = {};
    const read = vi.fn(async () => ["place"]);
    const first = shareServerRead(database, "alice", "collection:destinations", read);
    expect(shareServerRead(database, "alice", "collection:destinations", read)).toBe(first);
    expect(await first).toEqual(["place"]);
    await shareServerRead(database, "alice", "collection:destinations", read);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("isolates accounts, databases and query paths and permits retry after failure", async () => {
    expect(isCloudQuotaError({ code: "firestore/resource-exhausted" })).toBe(true);
    expect(isCloudQuotaError({ code: "permission-denied" })).toBe(false);
    expect(friendlyAuthError({ code: "resource-exhausted" }, "Login failed")).toBe("Cloud data cannot be refreshed right now. Please try again later.");
    expect(friendlyAuthError(new Error("Internal provider detail"), "Login failed")).toBe("Login failed");
    const database = {}, read = vi.fn(async () => "record");
    await Promise.all([
      shareServerRead(database, "alice", "doc:users/alice", read),
      shareServerRead(database, "bob", "doc:users/alice", read),
      shareServerRead({}, "alice", "doc:users/alice", read),
      shareServerRead(database, "alice", "collection:users", read),
    ]);
    expect(read).toHaveBeenCalledTimes(4);
    await expect(shareServerRead(database, "alice", "failed", async () => { throw new Error("Quota exceeded"); })).rejects.toThrow("Quota exceeded");
    expect(await shareServerRead(database, "alice", "failed", read)).toBe("record");
  });
});
