import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../types";
import { createItinerary } from "./itineraries";

const mock = vi.hoisted(() => ({ uid: "alice", cloud: true, records: new Map<string, Record<string, unknown>>(), listen: vi.fn(), stop: vi.fn() }));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => mock.cloud, getFirebaseServices: () => ({ auth: { currentUser: { uid: mock.uid } }, db: {} }) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, collection: string, id: string) => ({ collection, id }),
  collection: (_db: unknown, name: string) => ({ name }),
  where: (field: string, operator: string, value: string) => ({ field, operator, value }),
  query: (collection: unknown, ...filters: unknown[]) => ({ collection, filters }),
  onSnapshot: mock.listen,
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => action({
    get: async ({ id }: { id: string }) => ({ exists: () => mock.records.has(id), data: () => mock.records.get(id) }),
    set: ({ id }: { id: string }, value: Record<string, unknown>) => mock.records.set(id, value),
  }),
}));
import { cacheItineraries, deleteItinerary, itineraryDeadline, loadItineraryCache, saveItinerary, subscribeItineraries } from "./itineraryStorage";

const user = { id: "alice", role: "tourist" } as User;
let storage: Map<string, string>;
beforeEach(() => {
  vi.clearAllMocks(); mock.uid = "alice"; mock.cloud = true; mock.records.clear(); mock.listen.mockReturnValue(mock.stop);
  storage = new Map();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("itinerary persistence", () => {
  it("saves a new plan and edits using sequential revision checks", async () => {
    const plan = createItinerary("alice", "A trip");
    const first = await saveItinerary(plan, user);
    expect(first.revision).toBe(1);
    const second = await saveItinerary({ ...first, title: "New name" }, user);
    expect(second.revision).toBe(2);
    await expect(saveItinerary({ ...first, title: "Stale phone" }, user)).rejects.toMatchObject({ code: "conflict" });
    expect(mock.records.get(plan.id)?.title).toBe("New name");
  });
  it("does not resurrect a deleted plan when a stale save arrives", async () => {
    const plan = createItinerary("alice", "A trip");
    await deleteItinerary(plan, user);
    expect(mock.records.get(plan.id)?.deletedAt).toBeTruthy();
    await expect(saveItinerary(plan, user)).rejects.toMatchObject({ code: "conflict" });
  });
  it("rejects stale deletions and saves after a document disappears", async () => {
    const first = await saveItinerary(createItinerary("alice", "A trip"), user);
    await saveItinerary({ ...first, notes: "New device" }, user);
    await expect(deleteItinerary(first, user)).rejects.toMatchObject({ code: "conflict" });
    mock.records.clear();
    await expect(saveItinerary(first, user)).rejects.toMatchObject({ code: "conflict" });
  });
  it("rejects wrong owners and invalid editor values before a write", async () => {
    const plan = createItinerary("alice", "A trip");
    mock.uid = "bob";
    await expect(saveItinerary(plan, user)).rejects.toMatchObject({ code: "unavailable" });
    await expect(saveItinerary({ ...plan, userId: "bob" }, user)).rejects.toMatchObject({ code: "invalid" });
    await expect(saveItinerary({ ...plan, title: " " }, user)).rejects.toMatchObject({ code: "invalid" });
    expect(mock.records.size).toBe(0);
  });
  it("uses an owner-scoped live query and ignores cache-only or pending writes", async () => {
    const changed = vi.fn();
    const stop = await subscribeItineraries(user, changed, vi.fn());
    expect(mock.listen.mock.calls[0][0]).toMatchObject({ collection: { name: "tourist_itineraries" }, filters: [{ field: "userId", value: "alice" }, { field: "deletedAt", value: "" }] });
    const receive = mock.listen.mock.calls[0][2];
    const plan = { ...createItinerary("alice", "A trip"), revision: 1 };
    const docs = [{ id: plan.id, data: () => plan }];
    receive({ metadata: { fromCache: true }, docs });
    receive({ metadata: { fromCache: false, hasPendingWrites: true }, docs });
    expect(changed).not.toHaveBeenCalled();
    receive({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [...docs, { id: "invalid", data: () => ({}) }] });
    expect(changed).toHaveBeenCalledWith([plan]);
    stop(); expect(mock.stop).toHaveBeenCalled();
  });
  it("keeps local drafts separate per user and reports blocked storage", () => {
    const plan = createItinerary("alice", "");
    expect(cacheItineraries("alice", [{ plan, dirty: true }, { plan: { ...plan, userId: "bob" }, dirty: true }])).toBe(true);
    expect(loadItineraryCache("alice")).toEqual([{ plan, dirty: true }]);
    expect(loadItineraryCache("bob")).toEqual([]);
    vi.stubGlobal("localStorage", { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } });
    expect(loadItineraryCache("alice")).toEqual([]);
    expect(cacheItineraries("alice", [])).toBe(false);
  });
  it("supports local-only plans without claiming a cloud write", async () => {
    mock.cloud = false;
    const plan = createItinerary("alice", "Local plan");
    expect((await saveItinerary(plan, user)).revision).toBe(1);
    expect(mock.records.size).toBe(0);
  });
  it("bounds an unanswered operation and clears its timer", async () => {
    vi.useFakeTimers();
    const result = itineraryDeadline(new Promise<never>(() => {})).catch((error) => error.code);
    await vi.advanceTimersByTimeAsync(12000);
    expect(await result).toBe("unavailable");
    expect(vi.getTimerCount()).toBe(0);
  });
});
