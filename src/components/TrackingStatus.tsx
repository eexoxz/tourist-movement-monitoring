import { Cloud, LocateFixed, Smartphone } from "lucide-react";
import type { MovementPoint } from "../types";
import { translate, type Locale } from "../services/i18n";
import { uiText } from "../services/uiText";
import { travelerStatusText } from "../services/travelerStatusCopy";

export function TrackingStatus({ point, listening, syncStatus, locale }: { point?: MovementPoint; listening: boolean; syncStatus?: string; locale: Locale }) {
  const text = (key: Parameters<typeof travelerStatusText>[1]) => travelerStatusText(locale, key);
  const timestamp = point && Number.isFinite(Date.parse(point.recordedAt)) ? point.recordedAt : undefined;
  return <dl className="tracking-status-grid">
    <div><dt><LocateFixed size={16} />GPS</dt><dd>{text(listening ? "listening" : "paused")}</dd></div>
    <div><dt><Smartphone size={16} />{text("latest")}</dt><dd>{timestamp ? <><time dateTime={timestamp}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "medium" }).format(new Date(timestamp))}</time><small>{text("local")}</small></> : translate(locale, "common.waiting")}</dd></div>
    {syncStatus && <div><dt><Cloud size={16} />{text("cloud")}</dt><dd>{uiText(locale, syncStatus)}</dd></div>}
  </dl>;
}
