import type { IncidentReport } from "../types";

export function mergeIncidentReports(local: IncidentReport[], remote: IncidentReport[]) {
  const records = new Map(local.map((record) => [record.id, record]));
  for (const record of remote) {
    const existing = records.get(record.id);
    if (!existing || record.updatedAt >= existing.updatedAt) records.set(record.id, record);
  }
  const merged = [...records.values()];
  return JSON.stringify(merged) === JSON.stringify(local) ? local : merged;
}
