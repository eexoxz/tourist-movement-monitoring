import { getPathForView } from "./access";
import type { User } from "../types";

const CHECK_IN_PARAM = "checkin";
const PASS_PARAM = "pass";
const DEFAULT_LOCAL_ORIGIN = "http://localhost:4175";
const CHECK_IN_PATH = "/check-in";

type LocationLike = Pick<Location, "hostname" | "origin" | "port" | "protocol">;

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function configuredPublicOrigin() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim();

  if (!configured) {
    return "";
  }

  try {
    return new URL(configured).origin;
  } catch {
    return "";
  }
}

export function getShareableAppOrigin(location: LocationLike | null = typeof window === "undefined" ? null : window.location) {
  const publicOrigin = configuredPublicOrigin();
  if (publicOrigin) {
    return publicOrigin;
  }

  if (!location) {
    return DEFAULT_LOCAL_ORIGIN;
  }

  return location.origin;
}

export function isLocalOnlyQrOrigin(location: LocationLike | null = typeof window === "undefined" ? null : window.location) {
  return !configuredPublicOrigin() && Boolean(location && isLoopbackHost(location.hostname));
}

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createTouristPassId(user: User) {
  const source = `${user.authUid ?? user.id}${user.email}${user.passportNumber ?? ""}`;
  return `MYP-${hashSeed(source).toString(36).toUpperCase().slice(0, 6).padEnd(6, "0")}`;
}

export function createTouristCheckInUrl(destinationId: string, passId?: string) {
  const url = new URL(CHECK_IN_PATH, getShareableAppOrigin());
  url.searchParams.set(CHECK_IN_PARAM, destinationId);

  if (passId) {
    url.searchParams.set(PASS_PARAM, passId);
  }

  return url.toString();
}

export function createTouristPassUrl(passId: string) {
  const url = new URL(getPathForView("tourist", "profile"), getShareableAppOrigin());
  url.searchParams.set(PASS_PARAM, passId);
  return url.toString();
}

export function getTouristCheckInDestinationIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(CHECK_IN_PARAM);
}

export function getTouristCheckInRequestFromUrl() {
  if (typeof window === "undefined" || !isTouristCheckInRoute(window.location.pathname)) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return {
    destinationId: params.get(CHECK_IN_PARAM),
    passId: params.get(PASS_PARAM),
  };
}

export function isTouristCheckInRoute(pathname: string) {
  return (pathname.replace(/\/+$/, "") || "/") === CHECK_IN_PATH;
}
