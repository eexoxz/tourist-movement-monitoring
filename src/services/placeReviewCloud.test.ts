import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttractionCheckIn, PlaceReview, User } from "../types";
import { initialData } from "../data/demoData";

const mock = vi.hoisted(() => ({ uid: "admin", reports: new Map<string, unknown>(), set: vi.fn(), update: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => ({ auth: { currentUser: { uid: mock.uid } }, db: {} }) }));
vi.mock("firebase/firestore", () => ({
  documentId: () => "__name__", or: (...clauses: unknown[]) => ({ clauses }),
  collection: (_db: unknown, name: string) => ({ name }),
  where: (field: string, operator: string, value: unknown) => ({ field, operator, value }),
  query: (collection: unknown, filter: unknown) => ({ collection, filter }),
  onSnapshot: mock.subscribe,
  doc: (_db: unknown, name: string, id: string) => ({ name, id }),
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => action({
    get: async (reference: { name: string; id: string }) => ({ exists: () => mock.reports.has(reference.id), data: () => mock.reports.get(reference.id), id: reference.id }),
    set: mock.set, update: mock.update,
  }),
}));
import { saveCheckInRecord, savePlaceReview, subscribeCheckInRecords, subscribePlaceReviewRecords } from "./storage";
const actor = { id: "admin", role: "admin" } as User;
const record: AttractionCheckIn = { id: "report", userId: "tourist", destinationId: "", status: "checked-in", checkedInAt: "2026-10-13T01:00:00Z", submittedPlace: { name: "QA visitor report", address: "Full test street address", city: "George Town", state: "Penang", category: "food", note: "" }, reviewStatus: "pending" };
const review: PlaceReview = { checkInIds: [record.id], status: "linked", destinationId: "approved", reviewedBy: "admin", reviewedAt: "2026-10-13T02:00:00Z", destination: { ...initialData.destinations[0], id: "approved" } };

describe("place review cloud writes", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.uid = "admin"; mock.reports = new Map([[record.id, record]]); mock.subscribe.mockReturnValue(mock.unsubscribe); });
  it("never writes synthetic review samples to the cloud", async () => {
    expect(await saveCheckInRecord({ ...record, isDemo: true }, actor)).toBe(false);
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("confirms a new GPS-only tourist report through a targeted transaction", async () => {
    mock.uid = "tourist";
    mock.reports.clear();
    const gps = { ...record, latitude: 5.414, longitude: 100.329, submittedPlace: { ...record.submittedPlace!, address: "", city: "", state: undefined, accuracyMeters: 20 } };
    expect(await saveCheckInRecord(gps, { id: "tourist", role: "tourist" } as User)).toBe(true);
    expect(mock.set).toHaveBeenCalledWith({ name: "attraction_checkins", id: record.id }, expect.objectContaining({ latitude: 5.414, submittedPlace: expect.not.objectContaining({ state: expect.anything() }) }));
  });
  it("subscribes only to pending reports, waits for server confirmation, and forwards resolved removals", async () => {
    const changed = vi.fn();
    const error = vi.fn();
    const stop = await subscribePlaceReviewRecords(actor, changed, error);
    expect(mock.subscribe.mock.calls[0][0]).toMatchObject({ filter: { field: "reviewStatus", operator: "==", value: "pending" } });
    expect(mock.subscribe.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
    const receive = mock.subscribe.mock.calls[0][2];
    const doc = { id: record.id, data: () => record };
    receive({ metadata: { fromCache: true }, docs: [doc], docChanges: () => [] });
    expect(changed).not.toHaveBeenCalled();
    receive({ metadata: { fromCache: false }, docs: [doc], docChanges: () => [] });
    expect(changed).toHaveBeenCalledWith([expect.objectContaining({ id: record.id, reviewStatus: "pending" })], []);
    receive({ metadata: { fromCache: false }, docs: [], docChanges: () => [{ type: "removed", doc: { ...doc, data: () => ({ ...record, reviewStatus: "linked", destinationId: "approved" }) } }] });
    expect(changed).toHaveBeenLastCalledWith([], [expect.objectContaining({ reviewStatus: "linked", destinationId: "approved" })]);
    mock.subscribe.mock.calls[0][3](new Error("permission-denied"));
    expect(error).toHaveBeenCalled();
    stop();
    expect(mock.unsubscribe).toHaveBeenCalled();
  });
  it("does not start an admin queue listener for a tourist or mismatched account", async () => {
    await subscribePlaceReviewRecords({ ...actor, role: "tourist" }, vi.fn(), vi.fn());
    await subscribePlaceReviewRecords({ ...actor, id: "other" }, vi.fn(), vi.fn());
    expect(mock.subscribe).not.toHaveBeenCalled();
  });
  it("scopes live visits to the signed-in tourist and ignores unconfirmed snapshots", async () => {
    mock.uid = "tourist";
    const changed = vi.fn();
    const stop = await subscribeCheckInRecords({ id: "tourist", role: "tourist" } as User, changed, vi.fn());
    expect(mock.subscribe.mock.calls[0][0]).toMatchObject({ filter: { field: "userId", value: "tourist" } });
    const receive = mock.subscribe.mock.calls[0][2];
    const docs = [{ id: record.id, data: () => record }];
    receive({ metadata: { fromCache: true, hasPendingWrites: false }, docs });
    receive({ metadata: { fromCache: false, hasPendingWrites: true }, docs });
    expect(changed).not.toHaveBeenCalled();
    receive({ metadata: { fromCache: false, hasPendingWrites: false }, docs });
    expect(changed).toHaveBeenCalledWith([expect.objectContaining({ id: record.id, userId: "tourist" })]);
    stop();
    expect(mock.unsubscribe).toHaveBeenCalled();
  });
  it("allows admin live visits but refuses a listener for a mismatched account", async () => {
    await subscribeCheckInRecords(actor, vi.fn(), vi.fn());
    expect(mock.subscribe.mock.calls[0][0]).toMatchObject({ collection: { name: "attraction_checkins" }, filter: { clauses: expect.any(Array) } });
    mock.subscribe.mockClear();
    await subscribeCheckInRecords({ ...actor, id: "other" }, vi.fn(), vi.fn());
    expect(mock.subscribe).not.toHaveBeenCalled();
  });
  it("retries an existing visit without duplicating it or reopening a checkout", async () => {
    mock.uid = "tourist";
    const tourist = { id: "tourist", role: "tourist" } as User;
    expect(await saveCheckInRecord(record, tourist)).toBe(true);
    mock.reports.set(record.id, { ...record, status: "checked-out", checkedOutAt: "2026-10-13T03:00:00Z" });
    expect(await saveCheckInRecord(record, tourist)).toBe(true);
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("creates the catalogue place and updates review fields in one transaction without replacing visit times", async () => {
    expect(await savePlaceReview(review, actor)).toBe(true);
    expect(mock.set).toHaveBeenCalledWith({ name: "destinations", id: "approved" }, expect.objectContaining({ id: "approved" }));
    expect(mock.update).toHaveBeenCalledWith({ name: "attraction_checkins", id: record.id }, { destinationId: "approved", reviewStatus: "linked", reviewedBy: "admin", reviewedAt: review.reviewedAt });
  });
  it("rejects tourists and changed report batches before any writes", async () => {
    expect(await savePlaceReview(review, { ...actor, role: "tourist" })).toBe(false);
    mock.reports.set(record.id, { ...record, reviewStatus: "linked" });
    await expect(savePlaceReview(review, actor)).rejects.toThrow("changed");
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("acknowledges an identical committed review without duplicate places or writes", async () => {
    mock.reports.set(record.id, { ...record, reviewStatus: review.status, destinationId: review.destinationId, reviewedBy: review.reviewedBy, reviewedAt: review.reviewedAt });
    expect(await savePlaceReview(review, actor)).toBe(true);
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("checks that a target existing place still exists", async () => {
    await expect(savePlaceReview({ ...review, destination: undefined }, actor)).rejects.toThrow("no longer exists");
    expect(mock.update).not.toHaveBeenCalled();
  });
  it("limits stale tourist updates to checkout without overwriting admin approval", async () => {
    mock.uid = "tourist";
    mock.reports.set(record.id, { ...record, destinationId: "approved", reviewStatus: "linked", reviewedBy: "admin" });
    expect(await saveCheckInRecord({ ...record, status: "checked-out", checkedOutAt: "2026-10-13T03:00:00Z" }, { id: "tourist", role: "tourist" } as User)).toBe(true);
    expect(mock.set).not.toHaveBeenCalled();
    expect(mock.update).toHaveBeenCalledWith({ name: "attraction_checkins", id: record.id }, { status: "checked-out", checkedOutAt: "2026-10-13T03:00:00Z" });
  });
});
