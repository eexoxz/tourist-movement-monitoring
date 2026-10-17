import { LAST_BROWSER_LOCATION_KEY_PREFIX } from "./browserLocation";
import { hasPendingCloudChanges } from "./cloudChanges";
import { rememberedLoginKey } from "./loginPreferences";
import { hasPendingCheckInChanges, pendingCheckInsKey } from "./pendingCheckIns";
import { clearLocalDownloadCache } from "./storage";
import { PROFILE_SKIP_KEY_PREFIX } from "./workspaceSupport";
import { validItinerary } from "./itineraries";

const itineraryPrefix = "tourist-movement-monitoring:itineraries:";
const keys = () => Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key): key is string => key !== null);

export function hasUnsyncedDeviceWork() {
  if (hasPendingCloudChanges() || hasPendingCheckInChanges()) return true;
  const pending: unknown = JSON.parse(localStorage.getItem(pendingCheckInsKey) ?? "[]");
  if (!Array.isArray(pending) || pending.length) return true;
  return keys().filter((key) => key.startsWith(itineraryPrefix)).some((key) => {
    const entries: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return !Array.isArray(entries) || entries.some((entry) => !entry || entry.dirty !== false || !validItinerary(entry.plan));
  });
}

export class UnsyncedDeviceWork extends Error {}

export function clearDownloadedDeviceData() {
  // Check every owner before removing anything; queued changes and drafts are never cleanup targets.
  if (hasUnsyncedDeviceWork()) throw new UnsyncedDeviceWork();
  const downloaded = keys().filter((key) => key === rememberedLoginKey || key.startsWith(itineraryPrefix) || key.startsWith(LAST_BROWSER_LOCATION_KEY_PREFIX) || key.startsWith(PROFILE_SKIP_KEY_PREFIX));
  clearLocalDownloadCache();
  downloaded.forEach((key) => localStorage.removeItem(key));
}
