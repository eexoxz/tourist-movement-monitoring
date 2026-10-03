import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { closeOwnSosAlert, createIncidentReport, createSosAlert, getOpenSafetyCount, mergeSosAlerts, preferredSosAlert, updateIncidentStatus, updateSosStatus } from "./safety";

describe("safety service", () => {
  it("creates an SOS alert with optional tourist location", () => {
    const result = createSosAlert(initialData, "tourist-demo", { latitude: 3.142, longitude: 101.6894 });

    expect(result.alert.status).toBe("open");
    expect(result.alert.latitude).toBe(3.142);
    expect(result.data.sosAlerts[0].id).toBe(result.alert.id);
  });

  it("requires useful incident descriptions", () => {
    const invalid = createIncidentReport(initialData, {
      userId: "tourist-demo",
      type: "lost-item",
      description: "bag",
    });

    expect(invalid.error).toBe("Describe the incident in at least 10 characters.");
  });

  it("reuses an open or reviewing request instead of creating duplicates", () => {
    const first = createSosAlert(initialData, "tourist-demo");
    const repeated = createSosAlert(first.data, "tourist-demo", { latitude: 5.4, longitude: 100.28 });
    expect(repeated.alreadyOpen).toBe(true);
    expect(repeated.alert).toBe(first.alert);
    expect(repeated.data).toBe(first.data);
    expect(createSosAlert(initialData, "tourist-nature-demo").alreadyOpen).toBe(true);
  });

  it.each(["cancelled", "help-received"] as const)("closes owned requests as %s without deleting history or notes", (reason) => {
    const before = getOpenSafetyCount(initialData);
    const closed = closeOwnSosAlert(initialData, "tourist-nature-demo", "sos-demo-open", reason);
    const alert = closed.sosAlerts.find((record) => record.id === "sos-demo-open")!;
    expect(alert.status).toBe("resolved");
    expect(alert.closureReason).toBe(reason);
    expect(alert.closedBy).toBe("tourist-nature-demo");
    expect(alert.resolvedAt).toBeTruthy();
    expect(alert.adminNote).toBe(initialData.sosAlerts[0].adminNote);
    expect(closed.sosAlerts).toHaveLength(initialData.sosAlerts.length);
    expect(getOpenSafetyCount(closed)).toBe(before - 1);
    expect(closeOwnSosAlert(closed, alert.userId, alert.id, reason)).toBe(closed);
    expect(createSosAlert(closed, alert.userId).alreadyOpen).toBe(false);
  });

  it("does not let a tourist close another person's request or an unknown request", () => {
    expect(closeOwnSosAlert(initialData, "tourist-demo", "sos-demo-open", "cancelled")).toBe(initialData);
    expect(closeOwnSosAlert(initialData, "tourist-nature-demo", "missing", "cancelled")).toBe(initialData);
  });

  it("allows all legacy duplicate requests to be individually closed", () => {
    const first = createSosAlert(initialData, "tourist-demo").alert;
    let data = { ...initialData, sosAlerts: [first, { ...first, id: "duplicate-2" }, { ...first, id: "duplicate-3" }] };
    for (const id of data.sosAlerts.map((alert) => alert.id)) data = closeOwnSosAlert(data, "tourist-demo", id, "cancelled");
    expect(data.sosAlerts.every((alert) => alert.status === "resolved")).toBe(true);
  });

  it("keeps closure terminal while allowing an administrator to add a response", () => {
    const closed = closeOwnSosAlert(initialData, "tourist-nature-demo", "sos-demo-open", "cancelled");
    const updated = updateSosStatus(closed, "sos-demo-open", "open", "Test request, no assistance required.");
    expect(updated.sosAlerts[0]).toMatchObject({ status: "resolved", closureReason: "cancelled", closedBy: "tourist-nature-demo" });
    expect(updated.sosAlerts[0].resolvedAt).toBe(closed.sosAlerts[0].resolvedAt);
    expect(updated.sosAlerts[0].adminNote).toContain("Test request");
  });

  it("merges cross-device closures without stale saves reopening cases or dropping pending local records", () => {
    const open = createSosAlert(initialData, "tourist-demo").alert;
    const closed = { ...open, status: "resolved" as const, closureReason: "cancelled" as const };
    const stale = { ...open, updatedAt: "2099-01-01T00:00:00Z" };
    expect(preferredSosAlert(stale, closed)).toBe(closed);
    expect(preferredSosAlert(closed, stale)).toBe(closed);
    const pending = { ...open, id: "pending-local" };
    const merged = mergeSosAlerts([stale, pending], [closed]);
    expect(merged.find((alert) => alert.id === open.id)).toBe(closed);
    expect(merged.find((alert) => alert.id === pending.id)).toBe(pending);
    const corrected = { ...closed, adminNote: "Latest response preserved by the server." };
    expect(mergeSosAlerts([closed], [corrected])[0].adminNote).toBe(corrected.adminNote);
  });

  it("stores incident photo evidence with the report", () => {
    const result = createIncidentReport(initialData, {
      userId: "tourist-demo",
      type: "lost-item",
      description: "My backpack was missing near the entrance counter.",
      photoDataUrl: "data:image/jpeg;base64,abc123",
      photoName: "backpack.jpg",
      photoType: "image/jpeg",
      photoSizeBytes: 1280,
      photoCapturedAt: "2026-09-18T08:00:00.000Z",
    });

    expect(result.report?.photoName).toBe("backpack.jpg");
    expect(result.data?.incidentReports[0].photoDataUrl).toContain("data:image/jpeg");
  });

  it("updates safety record statuses", () => {
    const sosData = updateSosStatus(initialData, "sos-demo-open", "resolved", "Officer is calling the emergency contact.");
    const incidentData = updateIncidentStatus(initialData, "incident-demo-lost-bag", "reviewing", "Check with the attraction counter.");

    expect(sosData.sosAlerts.find((alert) => alert.id === "sos-demo-open")?.status).toBe("resolved");
    expect(sosData.sosAlerts.find((alert) => alert.id === "sos-demo-open")?.resolvedAt).toBeTruthy();
    expect(sosData.sosAlerts.find((alert) => alert.id === "sos-demo-open")?.adminNote).toBe("Officer is calling the emergency contact.");
    expect(incidentData.incidentReports.find((report) => report.id === "incident-demo-lost-bag")?.status).toBe("reviewing");
    expect(incidentData.incidentReports.find((report) => report.id === "incident-demo-lost-bag")?.adminNote).toBe("Check with the attraction counter.");
  });
});
