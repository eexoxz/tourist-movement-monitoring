import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttractionCheckIn, PlaceReview, User } from "../types";
import { initialData } from "../data/demoData";

const mock = vi.hoisted(() => ({ uid: "admin", reports: new Map<string, unknown>(), set: vi.fn(), update: vi.fn() }));
vi.mock("./firebaseClient", () => ({ isFirebaseConfigured: () => true, getFirebaseServices: () => ({ auth: { currentUser: { uid: mock.uid } }, db: {} }) }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, name: string, id: string) => ({ name, id }),
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => action({
    get: async (reference: { name: string; id: string }) => ({ exists: () => mock.reports.has(reference.id), data: () => mock.reports.get(reference.id), id: reference.id }),
    set: mock.set, update: mock.update,
  }),
}));
import { saveCheckInRecord, savePlaceReview } from "./storage";
const actor = { id: "admin", role: "admin" } as User;
const record: AttractionCheckIn = { id: "report", userId: "tourist", destinationId: "", status: "checked-in", checkedInAt: "2026-10-13T01:00:00Z", submittedPlace: { name: "QA visitor report", address: "Full test street address", city: "George Town", state: "Penang", category: "food", note: "" }, reviewStatus: "pending" };
const review: PlaceReview = { checkInIds: [record.id], status: "linked", destinationId: "approved", reviewedBy: "admin", reviewedAt: "2026-10-13T02:00:00Z", destination: { ...initialData.destinations[0], id: "approved" } };

describe("place review cloud writes", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.uid = "admin"; mock.reports = new Map([[record.id, record]]); });
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
