import type { MovementPoint } from "../types";

export const gpsStaleAfterMs = 2 * 60 * 1000;
export type TrackingHealth = "paused" | "background" | "attention" | "waiting" | "stale" | "receiving";

export function getTrackingHealth({ listening, visible, fix, attention = false, now = Date.now() }: {
  listening: boolean; visible: boolean; fix?: MovementPoint; attention?: boolean; now?: number;
}): TrackingHealth {
  if (!listening) return "paused";
  if (!visible) return "background";
  if (attention) return "attention";
  const timestamp = fix?.source === "browser" ? Date.parse(fix.recordedAt) : NaN;
  if (!Number.isFinite(timestamp) || timestamp > now + 60000) return "waiting";
  return now - timestamp > gpsStaleAfterMs ? "stale" : "receiving";
}
