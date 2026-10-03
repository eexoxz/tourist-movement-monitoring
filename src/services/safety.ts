import type { AppData, IncidentReport, IncidentType, MovementPoint, SafetyStatus, SosAlert, SosClosureReason } from "../types";
import { createId } from "./storage";

export type SafetyLocation = Pick<MovementPoint, "latitude" | "longitude"> | null | undefined;

export function createSosAlert(data: AppData, userId: string, location?: SafetyLocation) {
  const existing = data.sosAlerts.find((alert) => alert.userId === userId && alert.status !== "resolved");
  if (existing) return { alert: existing, data, alreadyOpen: true };
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
    alreadyOpen: false,
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
    photoDataUrl?: string;
    photoName?: string;
    photoType?: string;
    photoSizeBytes?: number;
    photoCapturedAt?: string;
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
    photoDataUrl: input.photoDataUrl,
    photoName: input.photoName,
    photoType: input.photoType,
    photoSizeBytes: input.photoSizeBytes,
    photoCapturedAt: input.photoCapturedAt,
  };

  return {
    report,
    data: {
      ...data,
      incidentReports: [report, ...data.incidentReports],
    },
  };
}

export function updateSosStatus(data: AppData, alertId: string, status: SafetyStatus, adminNote?: string, closureReason?: SosClosureReason, closedBy?: string) {
  const now = new Date().toISOString();
  const cleanAdminNote = adminNote?.trim() || undefined;
  return {
    ...data,
    sosAlerts: data.sosAlerts.map((alert) =>
      alert.id === alertId
        ? {
            ...alert,
            status: alert.status === "resolved" ? "resolved" : status,
            updatedAt: now,
            resolvedAt: alert.resolvedAt ?? (status === "resolved" ? now : undefined),
            closureReason: alert.status === "resolved" ? alert.closureReason : status === "resolved" ? closureReason ?? "help-received" : undefined,
            closedBy: alert.status === "resolved" ? alert.closedBy : status === "resolved" ? closedBy : undefined,
            adminNote: cleanAdminNote,
          }
        : alert
    ),
  };
}

export function closeOwnSosAlert(data: AppData, userId: string, alertId: string, reason: SosClosureReason): AppData {
  const alert = data.sosAlerts.find((candidate) => candidate.id === alertId && candidate.userId === userId);
  if (!alert || alert.status === "resolved") return data;
  return updateSosStatus(data, alertId, "resolved", alert.adminNote, reason, userId);
}

// A closed case is terminal: delayed writes from another device must not reopen it.
export function preferredSosAlert(incoming: SosAlert, existing: SosAlert): SosAlert {
  if (existing.status === "resolved" && incoming.status !== "resolved") return existing;
  if (incoming.status === "resolved" && existing.status !== "resolved") return incoming;
  return Date.parse(incoming.updatedAt) > Date.parse(existing.updatedAt) ? incoming : existing;
}

export function mergeSosAlerts(local: SosAlert[], remote: SosAlert[]): SosAlert[] {
  const records = new Map(local.map((alert) => [alert.id, alert]));
  for (const alert of remote) {
    const previous = records.get(alert.id);
    const sameVersion = previous && alert.status === previous.status && Date.parse(alert.updatedAt) === Date.parse(previous.updatedAt);
    records.set(alert.id, previous && !sameVersion ? preferredSosAlert(alert, previous) : alert);
  }
  return [...records.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function updateIncidentStatus(data: AppData, reportId: string, status: SafetyStatus, adminNote?: string) {
  const now = new Date().toISOString();
  const cleanAdminNote = adminNote?.trim() || undefined;
  return {
    ...data,
    incidentReports: data.incidentReports.map((report) =>
      report.id === reportId
        ? {
            ...report,
            status,
            updatedAt: now,
            adminNote: cleanAdminNote,
          }
        : report
    ),
  };
}

export function getOpenSafetyCount(data: AppData) {
  return (
    data.sosAlerts.reduce((count, alert) => count + Number(alert.status !== "resolved"), 0) +
    data.incidentReports.reduce((count, report) => count + Number(report.status !== "resolved"), 0)
  );
}
