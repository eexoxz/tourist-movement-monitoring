import { getPathForView } from "./access";

const CHECK_IN_PARAM = "checkin";
const PASS_PARAM = "pass";

function currentOrigin() {
  return typeof window === "undefined" ? "http://localhost:4175" : window.location.origin;
}

export function createTouristCheckInUrl(destinationId: string, passId?: string) {
  const url = new URL(getPathForView("tourist", "overview"), currentOrigin());
  url.searchParams.set(CHECK_IN_PARAM, destinationId);

  if (passId) {
    url.searchParams.set(PASS_PARAM, passId);
  }

  return url.toString();
}

export function createTouristPassUrl(passId: string) {
  const url = new URL(getPathForView("tourist", "profile"), currentOrigin());
  url.searchParams.set(PASS_PARAM, passId);
  return url.toString();
}

export function getTouristCheckInDestinationIdFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get(CHECK_IN_PARAM);
}
