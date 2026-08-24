import type { AppView, UserRole } from "../types";

export type AuthMode = "login" | "register";

const touristViews: AppView[] = ["overview", "tracking", "history", "recommendations", "profile"];
const adminViews: AppView[] = ["dashboard", "destinations"];

const touristViewPaths: Partial<Record<AppView, string>> = {
  overview: "/app/home",
  tracking: "/app/tracking",
  history: "/app/trips",
  recommendations: "/app/recommendations",
  profile: "/app/profile",
};

const adminViewPaths: Partial<Record<AppView, string>> = {
  dashboard: "/admin/dashboard",
  destinations: "/admin/destinations",
};

const authModePaths: Record<AuthMode, string> = {
  login: "/login",
  register: "/register",
};

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

export function getPathForAuthMode(mode: AuthMode) {
  return authModePaths[mode];
}

export function getAuthModeFromPath(pathname: string): AuthMode | null {
  if (pathname === authModePaths.register) {
    return "register";
  }

  if (pathname === "/" || pathname === authModePaths.login) {
    return "login";
  }

  return null;
}

export function getPathForView(role: UserRole, view: AppView) {
  const safeView = coerceViewForRole(role, view);
  const paths = role === "admin" ? adminViewPaths : touristViewPaths;
  return paths[safeView] ?? paths[getDefaultViewForRole(role)] ?? "/login";
}

export function getViewFromPath(pathname: string): AppView | null {
  const route = pathname.replace(/\/+$/, "") || "/";
  const allPaths = { ...touristViewPaths, ...adminViewPaths };
  const match = Object.entries(allPaths).find(([, path]) => path === route);
  return (match?.[0] as AppView | undefined) ?? null;
}
