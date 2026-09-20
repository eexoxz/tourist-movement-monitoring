import { getPathForView } from "./access";

const CHECK_IN_PARAM = "checkin";
const PASS_PARAM = "pass";
const LOCAL_MOBILE_HOST = "192.168.50.176";

type LocationLike = Pick<Location, "hostname" | "origin" | "port" | "protocol">;

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getShareableAppOrigin(location: LocationLike | null = typeof window === "undefined" ? null : window.location) {
  if (!location) {
    return `http://${LOCAL_MOBILE_HOST}:4175`;
  }

  if (!isLoopbackHost(location.hostname)) {
    return location.origin;
  }

  const port = location.port || "4175";
  return `${location.protocol}//${LOCAL_MOBILE_HOST}:${port}`;
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
