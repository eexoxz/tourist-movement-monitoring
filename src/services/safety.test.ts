import { describe, expect, it } from "vitest";
import { initialData } from "../data/demoData";
import { createIncidentReport, createSosAlert, updateIncidentStatus, updateSosStatus } from "./safety";

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
