import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(), events: [] as string[], failCollection: "", switchSession: false,
  user: { uid: "alice", email: "alice@example.test", providerData: [{ providerId: "password" }], getIdToken: vi.fn() },
  currentUid: "alice", reauthenticate: vi.fn(), removeAuth: vi.fn(), listen: vi.fn(),
}));
vi.mock("./firebaseClient", () => ({ getFirebaseServices: () => ({ auth: { get currentUser() { return mock.currentUid ? { ...mock.user, uid: mock.currentUid } : null; } }, db: {} }) }));
vi.mock("firebase/auth", () => ({ EmailAuthProvider: { credential: (email: string, password: string) => ({ email, password }) }, reauthenticateWithCredential: mock.reauthenticate, deleteUser: mock.removeAuth }));
vi.mock("firebase/firestore", () => {
  const snapshot = (path: string) => ({ ref: path, exists: () => mock.documents.has(path), data: () => mock.documents.get(path), metadata: { fromCache: false } });
  return {
    doc: (_db: unknown, name: string, uid: string) => `${name}/${uid}`,
    collection: (_db: unknown, name: string) => name,
    where: (_field: string, _operator: string, value: string) => ({ value }), limit: (count: number) => ({ count }),
    query: (name: string, filter: { value: string }, page: { count: number }) => ({ name, uid: filter.value, limit: page.count }),
    serverTimestamp: () => "server-time",
    getDocFromServer: async (path: string) => snapshot(path),
    onSnapshot: mock.listen,
    runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => {
      await action({ get: async (path: string) => snapshot(path), set: (path: string, data: Record<string, unknown>) => { mock.events.push("lock"); mock.documents.set(path, data); } });
    },
    getDocsFromServer: async ({ name, uid, limit }: { name: string; uid: string; limit: number }) => {
      if (mock.failCollection === name) { mock.failCollection = ""; throw new Error("offline"); }
      const docs = [...mock.documents].filter(([path, data]) => path.startsWith(`${name}/`) && data.userId === uid).slice(0, limit).map(([path]) => snapshot(path));
      if (mock.switchSession) mock.currentUid = "bob";
      return { docs, empty: docs.length === 0 };
    },
    writeBatch: () => {
      const paths: string[] = [];
      return { delete: (path: string) => paths.push(path), commit: async () => { paths.forEach((path) => { mock.events.push(path); mock.documents.delete(path); }); } };
    },
  };
});
import { AccountDeletionError, deleteOwnAccount, hasAccountDeletion, privateAccountCollections, subscribeAccountDeletion } from "./accountDeletion";

const callbacks = () => ({ onStarted: vi.fn(() => mock.events.push("started")), onPhase: vi.fn(), clearLocal: vi.fn(() => mock.events.push("local")) });
beforeEach(() => {
  vi.clearAllMocks(); mock.documents.clear(); mock.events = []; mock.failCollection = ""; mock.switchSession = false; mock.currentUid = "alice";
  mock.documents.set("users/alice", { role: "tourist" }); mock.documents.set("users/bob", { role: "tourist" });
  mock.reauthenticate.mockResolvedValue(undefined); mock.user.getIdToken.mockResolvedValue("fresh-token");
  mock.removeAuth.mockImplementation(async () => { mock.events.push("auth"); mock.currentUid = ""; });
});
afterEach(() => vi.useRealTimers());

describe("restartable self-deletion", () => {
  it("pages only the owner's private records and deletes Authentication last", async () => {
    for (const name of privateAccountCollections) {
      mock.documents.set(`${name}/alice`, { userId: "alice" }); mock.documents.set(`${name}/bob`, { userId: "bob" });
    }
    for (let index = 0; index < 205; index++) mock.documents.set(`movement_records/point-${index}`, { userId: "alice" });
    for (const name of ["tourist_profiles", "tourist_preferences"]) mock.documents.set(`${name}/alice`, { userId: "alice" });
    mock.documents.set("destinations/shared-place", { name: "Shared" });
    const cb = callbacks();
    await deleteOwnAccount("alice", "not-persisted", cb);
    expect(mock.documents.has("users/alice")).toBe(false);
    for (const name of privateAccountCollections) { expect(mock.documents.has(`${name}/alice`)).toBe(false); expect(mock.documents.has(`${name}/bob`)).toBe(true); }
    expect([...mock.documents.keys()].some((path) => path.startsWith("movement_records/point-"))).toBe(false);
    expect(mock.documents.has("users/bob")).toBe(true);
    expect(mock.documents.has("destinations/shared-place")).toBe(true);
    expect(mock.documents.get("account_deletions/alice")).toEqual({ version: 1, startedAt: "server-time" });
    expect(mock.events.slice(-2)).toEqual(["local", "auth"]);
    expect(cb.onPhase.mock.calls.flat()).toEqual(["verifying", "records", "profile", "authentication"]);
  });
  it("does nothing destructive on wrong password or admin account", async () => {
    mock.reauthenticate.mockRejectedValueOnce({ code: "auth/wrong-password" });
    await expect(deleteOwnAccount("alice", "wrong", callbacks())).rejects.toMatchObject({ code: "auth/wrong-password" });
    expect(mock.events).toEqual([]);
    mock.documents.set("users/alice", { role: "admin" });
    await expect(deleteOwnAccount("alice", "password", callbacks())).rejects.toMatchObject({ code: "unavailable" });
    expect(mock.events).toEqual([]); expect(mock.removeAuth).not.toHaveBeenCalled();
  });
  it("retains the login and lock after partial failure, then resumes", async () => {
    mock.documents.set("movement_records/alice", { userId: "alice" }); mock.failCollection = "movement_records";
    await expect(deleteOwnAccount("alice", "password", callbacks())).rejects.toThrow("offline");
    expect(mock.documents.has("account_deletions/alice")).toBe(true); expect(mock.removeAuth).not.toHaveBeenCalled();
    await deleteOwnAccount("alice", "password", callbacks());
    expect(mock.documents.has("movement_records/alice")).toBe(false); expect(mock.removeAuth).toHaveBeenCalledOnce();
  });
  it("resumes even after profile removal if local cleanup failed", async () => {
    const cb = callbacks(); cb.clearLocal.mockImplementationOnce(() => { throw new Error("storage"); });
    await expect(deleteOwnAccount("alice", "password", cb)).rejects.toMatchObject({ code: "local" });
    expect(mock.documents.has("users/alice")).toBe(false); expect(mock.currentUid).toBe("alice");
    expect(await hasAccountDeletion("alice")).toBe(true);
    await deleteOwnAccount("alice", "password", callbacks());
    expect(mock.removeAuth).toHaveBeenCalledOnce();
  });
  it("rejects mismatched sessions and stops if identity changes during a query", async () => {
    await expect(deleteOwnAccount("bob", "password", callbacks())).rejects.toBeInstanceOf(AccountDeletionError);
    expect(mock.reauthenticate).not.toHaveBeenCalled();
    mock.switchSession = true; mock.documents.set("movement_records/alice", { userId: "alice" });
    await expect(deleteOwnAccount("alice", "password", callbacks())).rejects.toMatchObject({ code: "session" });
    expect(mock.documents.has("movement_records/alice")).toBe(true); expect(mock.removeAuth).not.toHaveBeenCalled();
  });
  it("can retry Authentication removal after the private data is already cleared", async () => {
    mock.removeAuth.mockRejectedValueOnce(new Error("authentication offline"));
    await expect(deleteOwnAccount("alice", "password", callbacks())).rejects.toThrow("authentication offline");
    expect(mock.documents.has("users/alice")).toBe(false);
    expect(mock.currentUid).toBe("alice");
    expect(await hasAccountDeletion("alice")).toBe(true);
    await deleteOwnAccount("alice", "password", callbacks());
    expect(mock.currentUid).toBe("");
    expect(mock.removeAuth).toHaveBeenCalledTimes(2);
  });
  it("subscribes to deletion locks without responding to cached or another session's state", async () => {
    const started = vi.fn(), stop = vi.fn(); mock.listen.mockReturnValue(stop);
    expect(await subscribeAccountDeletion("alice", started, vi.fn())).toBe(stop);
    const receive = mock.listen.mock.calls[0][1];
    receive({ metadata: { fromCache: true }, exists: () => true }); expect(started).not.toHaveBeenCalled();
    receive({ metadata: { fromCache: false }, exists: () => true }); expect(started).toHaveBeenCalledOnce();
    mock.currentUid = "bob";
    receive({ metadata: { fromCache: false }, exists: () => true }); expect(started).toHaveBeenCalledOnce();
  });
});
