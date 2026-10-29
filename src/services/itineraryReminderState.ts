export const ITINERARY_REMINDERS_KEY_PREFIX = "tourist-movement-monitoring:itinerary-reminders:";

export function loadItineraryDismissals(userId: string, tripId: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`${ITINERARY_REMINDERS_KEY_PREFIX}${userId}`) ?? "null");
    if (!value || typeof value !== "object" || !("tripId" in value) || value.tripId !== tripId || !("stops" in value) || !Array.isArray(value.stops)) return new Set();
    return new Set(value.stops.filter((id): id is string => typeof id === "string" && id.length < 200).slice(-40));
  } catch { return new Set(); }
}

export function saveItineraryDismissals(userId: string, tripId: string, stops: ReadonlySet<string>) {
  try { localStorage.setItem(`${ITINERARY_REMINDERS_KEY_PREFIX}${userId}`, JSON.stringify({ tripId, stops: [...stops].slice(-40) })); } catch { /* Keep the mounted reminder dismissed even if device storage is blocked. */ }
}
