import type { AppData, IncidentReport, IncidentType, MovementPoint, SafetyStatus, SosAlert } from "../types";
import { createId } from "./storage";

export type SafetyLocation = Pick<MovementPoint, "latitude" | "longitude"> | null | undefined;

export function createSosAlert(data: AppData, userId: string, location?: SafetyLocation) {
  const now = new Date().toISOString();
  const alert: SosAlert = {
    id: createId("sos"),
    userId,
    status: "open",
    message: "Tourist requested emergency assistance from the web app.",
    latitude: location?.latitude,
    longitude: location?.longitude,
    createdAt: now,
    updatedAt: now,
  };

  return {
    alert,
    data: {
      ...data,
      sosAlerts: [alert, ...data.sosAlerts],
    },
  };
}

export function createIncidentReport(
  data: AppData,
  input: {
    userId: string;
    type: IncidentType;
    description: string;
    locationNote?: string;
    location?: SafetyLocation;
  }
) {
  const description = input.description.trim();
  if (description.length < 10) {
    return { error: "Describe the incident in at least 10 characters." };
  }

  const now = new Date().toISOString();
  const report: IncidentReport = {
    id: createId("incident"),
    userId: input.userId,
    type: input.type,
    status: "open",
    description,
    locationNote: input.locationNote?.trim() || undefined,
    latitude: input.location?.latitude,
    longitude: input.location?.longitude,
    createdAt: now,
    updatedAt: now,
  };

  return {
    report,
    data: {
      ...data,
      incidentReports: [report, ...data.incidentReports],
    },
  };
}

export function updateSosStatus(data: AppData, alertId: string, status: SafetyStatus) {
  const now = new Date().toISOString();
  return {
    ...data,
    sosAlerts: data.sosAlerts.map((alert) =>
      alert.id === alertId
        ? {
            ...alert,
            status,
            updatedAt: now,
            resolvedAt: status === "resolved" ? now : alert.resolvedAt,
          }
        : alert
    ),
  };
}

export function updateIncidentStatus(data: AppData, reportId: string, status: SafetyStatus) {
  const now = new Date().toISOString();
  return {
    ...data,
    incidentReports: data.incidentReports.map((report) =>
      report.id === reportId
        ? {
            ...report,
            status,
            updatedAt: now,
          }
        : report
    ),
  };
}

export function getOpenSafetyCount(data: AppData) {
  return data.sosAlerts.filter((alert) => alert.status !== "resolved").length + data.incidentReports.filter((report) => report.status !== "resolved").length;
}
