import { Cloud, LocateFixed, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import type { MovementPoint } from "../types";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { travelerStatusText } from "../services/travelerStatusCopy";
import { getTrackingHealth } from "../services/trackingHealth";
import { deviceText } from "../services/deviceCopy";

export function TrackingStatus({ point, fix, attention, listening, syncStatus, locale }: { point?: MovementPoint; fix?: MovementPoint; attention?: boolean; listening: boolean; syncStatus?: string; locale: Locale }) {
  const [clock, setClock] = useState(() => ({ now: Date.now(), visible: typeof document === "undefined" || !document.hidden }));
  useEffect(() => {
    if (!listening) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const refresh = () => setClock({ now: Date.now(), visible: !document.hidden });
    const visibilityChanged = () => {
      clearInterval(timer);
      refresh();
      if (!document.hidden) timer = setInterval(refresh, 15000);
    };
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibilityChanged); window.removeEventListener("focus", refresh); };
  }, [listening]);
  const health = getTrackingHealth({ listening, visible: clock.visible, fix, attention, now: clock.now });
  const text = (key: Parameters<typeof travelerStatusText>[1]) => travelerStatusText(locale, key);
  const timestamp = point && Number.isFinite(Date.parse(point.recordedAt)) ? point.recordedAt : undefined;
  return <dl className="tracking-status-grid">
    <div><dt><LocateFixed size={16} />GPS</dt><dd className={`gps-health gps-health-${health}`} role="status">{health === "paused" ? text("paused") : deviceText(locale, health)}{["background", "stale", "waiting"].includes(health) && <small>{deviceText(locale, health === "background" ? "backgroundNote" : "signalNote")}</small>}</dd></div>
    <div><dt><Smartphone size={16} />{text("latest")}</dt><dd>{timestamp ? <><time dateTime={timestamp}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(new Date(timestamp))}</time><small>{text("local")}</small></> : translate(locale, "common.waiting")}</dd></div>
    {syncStatus && <div><dt><Cloud size={16} />{text("cloud")}</dt><dd>{uiText(locale, syncStatus)}</dd></div>}
  </dl>;
}
