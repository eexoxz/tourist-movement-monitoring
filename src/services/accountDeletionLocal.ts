import { LAST_BROWSER_LOCATION_KEY_PREFIX } from "./browserLocation";
import { forgetAccountCloudChanges } from "./cloudChanges";
import { rememberedLoginKey } from "./loginPreferences";
import { forgetAccountCheckIns } from "./pendingCheckIns";
import { clearLocalDownloadCache, clearSession } from "./storage";
import { PROFILE_SKIP_KEY_PREFIX } from "./workspaceSupport";
import { ITINERARY_REMINDERS_KEY_PREFIX } from "./itineraryReminderState";

export function clearDeletedAccountDeviceData(uid: string) {
  forgetAccountCloudChanges(uid);
  forgetAccountCheckIns(uid);
  for (const key of [rememberedLoginKey, `${LAST_BROWSER_LOCATION_KEY_PREFIX}${uid}`, `${PROFILE_SKIP_KEY_PREFIX}${uid}`, `tourist-movement-monitoring:itineraries:${uid}`, `${ITINERARY_REMINDERS_KEY_PREFIX}${uid}`]) localStorage.removeItem(key);
  clearLocalDownloadCache();
  clearSession();
}
