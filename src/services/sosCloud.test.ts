import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SosAlert, User } from "../types";

const mock = vi.hoisted(() => ({
  currentUser: { uid: "tourist" } as { uid: string } | null,
  existing: null as SosAlert | null,
  set: vi.fn(), listener: vi.fn(), error: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("./firebaseClient", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseServices: () => ({ auth: { currentUser: mock.currentUser }, db: {} }),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, name: string, id: string) => ({ name, id }),
  collection: (_db: unknown, name: string) => ({ name }),
  where: (field: string, op: string, value: string) => ({ field, op, value }),
  query: (source: unknown, filter: unknown) => ({ source, filter }),
  runTransaction: async (_db: unknown, action: (transaction: unknown) => Promise<void>) => action({
    get: async () => ({ exists: () => Boolean(mock.existing), data: () => mock.existing, id: mock.existing?.id }),
    set: mock.set,
  }),
  onSnapshot: (source: unknown, change: unknown, error: unknown) => {
    mock.listener(source, change); mock.error(error); return mock.unsubscribe;
  },
}));
import { saveSosAlertRecord, subscribeSosAlerts } from "./storage";

const actor = { id: "tourist", role: "tourist" } as User;
const alert: SosAlert = { id: "sos", userId: "tourist", status: "open", message: "Test", createdAt: "2026-10-03T10:00:00Z", updatedAt: "2026-10-03T10:00:00Z" };

describe("SOS cloud lifecycle", () => {
  beforeEach(() => { vi.clearAllMocks(); mock.currentUser = { uid: "tourist" }; mock.existing = null; });
  it("writes only the SOS document, including closure metadata", async () => {
    const closed = { ...alert, status: "resolved" as const, closureReason: "cancelled" as const, closedBy: "tourist" };
    expect(await saveSosAlertRecord(closed, actor)).toBe(true);
    expect(mock.set).toHaveBeenCalledWith({ name: "sos_alerts", id: "sos" }, expect.objectContaining(closed));
  });
  it("does not reopen a remotely closed request from an older device", async () => {
    mock.existing = { ...alert, status: "resolved", closureReason: "help-received" };
    expect(await saveSosAlertRecord(alert, actor)).toBe(true);
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated and other-owner writes", async () => {
    expect(await saveSosAlertRecord({ ...alert, userId: "other" }, actor)).toBe(false);
    expect(await saveSosAlertRecord(alert, { ...actor, id: "other" })).toBe(false);
    mock.currentUser = null;
    expect(await saveSosAlertRecord(alert, actor)).toBe(false);
    expect(mock.set).not.toHaveBeenCalled();
  });
  it("preserves the latest admin response when a tourist closes a case from an older screen", async () => {
    mock.existing = { ...alert, status: "reviewing", adminNote: "An officer is reviewing the request.", updatedAt: "2026-10-03T10:01:00Z" };
    await saveSosAlertRecord({ ...alert, status: "resolved", closureReason: "cancelled", updatedAt: "2026-10-03T10:02:00Z" }, actor);
    expect(mock.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ closureReason: "cancelled", adminNote: mock.existing.adminNote }));
  });
  it("allows a later admin note without replacing who closed the case and why", async () => {
    mock.existing = { ...alert, status: "resolved", closureReason: "cancelled", closedBy: "tourist", resolvedAt: "2026-10-03T10:01:00Z" };
    mock.currentUser = { uid: "admin" };
    await saveSosAlertRecord({ ...alert, status: "resolved", closureReason: "help-received", closedBy: "admin", adminNote: "Confirmed accidental request.", updatedAt: "2026-10-03T10:02:00Z" }, { ...actor, id: "admin", role: "admin" });
    expect(mock.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ closureReason: "cancelled", closedBy: "tourist", resolvedAt: mock.existing.resolvedAt, adminNote: "Confirmed accidental request." }));
  });
  it("rejects an attempt to replace an existing request's owner", async () => {
    mock.existing = { ...alert, userId: "other" };
    await expect(saveSosAlertRecord(alert, actor)).rejects.toThrow("ownership");
  });
  it("scopes tourist listeners, delivers statuses and returns cleanup", async () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const stop = await subscribeSosAlerts(actor, onChange, onError);
    expect(mock.listener.mock.calls[0][0]).toMatchObject({ filter: { field: "userId", op: "==", value: "tourist" } });
    mock.listener.mock.calls[0][1]({ docs: [{ id: alert.id, data: () => ({ ...alert, status: "resolved", closureReason: "cancelled" }) }] });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ status: "resolved", closureReason: "cancelled" })]);
    mock.error.mock.calls[0][0]();
    expect(onError).toHaveBeenCalled();
    stop(); expect(mock.unsubscribe).toHaveBeenCalled();
  });
  it("lets authenticated administrators review all cases, not other tourists", async () => {
    mock.currentUser = { uid: "admin" };
    await subscribeSosAlerts({ ...actor, id: "admin", role: "admin" }, vi.fn(), vi.fn());
    expect(mock.listener.mock.calls[0][0]).toEqual({ name: "sos_alerts" });
    vi.clearAllMocks();
    await subscribeSosAlerts(actor, vi.fn(), vi.fn());
    expect(mock.listener).not.toHaveBeenCalled();
  });
});
