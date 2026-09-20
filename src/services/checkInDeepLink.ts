import { getPathForView } from "./access";

const CHECK_IN_PARAM = "checkin";
const PASS_PARAM = "pass";
const DEFAULT_LOCAL_ORIGIN = "http://localhost:4175";

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

export function createTouristCheckInUrl(destinationId: string, passId?: string) {
  const url = new URL(getPathForView("tourist", "overview"), getShareableAppOrigin());
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
