import type { AppView, UserRole } from "../types";

const touristViews: AppView[] = ["overview", "tracking", "history", "recommendations", "profile"];
const adminViews: AppView[] = ["dashboard", "records", "destinations", "ai"];

export function getAllowedViewsForRole(role: UserRole) {
  return role === "admin" ? adminViews : touristViews;
}

export function getDefaultViewForRole(role: UserRole): AppView {
  return role === "admin" ? "dashboard" : "overview";
}

export function canAccessView(role: UserRole, view: AppView) {
  return getAllowedViewsForRole(role).includes(view);
}

export function coerceViewForRole(role: UserRole, view: AppView) {
  return canAccessView(role, view) ? view : getDefaultViewForRole(role);
}
