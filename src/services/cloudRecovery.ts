import type { User } from "../types";
import { loadCloudData } from "./storage";

export async function restoreCloudConnection(actor: User, isCurrent: () => boolean) {
  if (!isCurrent()) return null;
  const data = await loadCloudData(actor, isCurrent, { forceCatalogue: true });
  if (!isCurrent()) return null;
  if (!data || !data.users.some((user) => user.id === actor.id || Boolean(actor.authUid && user.authUid === actor.authUid))) throw new Error("Cloud refresh unavailable");
  return data;
}
