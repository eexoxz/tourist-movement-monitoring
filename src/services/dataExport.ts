import type { AppData, Itinerary, User } from "../types";

export function buildDataExport(data: AppData, actor: User, itineraries: Itinerary[] = []) {
  const owned = <T extends { userId?: string }>(rows: T[]) => actor.role === "admin" ? rows : rows.filter((row) => row.userId === actor.id);
  const users = (actor.role === "admin" ? data.users : data.users.filter((user) => user.id === actor.id))
    .map(({ password: _password, ...user }) => user);
  return {
    ...data, users,
    consents: owned(data.consents), trips: owned(data.trips), points: owned(data.points),
    analyses: owned(data.analyses), recommendations: owned(data.recommendations),
    sosAlerts: owned(data.sosAlerts), incidentReports: owned(data.incidentReports), checkIns: owned(data.checkIns),
    itineraries: actor.role === "tourist" ? itineraries.filter((plan) => plan.userId === actor.id && !plan.deletedAt) : [],
  };
}
