import { useState } from "react";
import type { SosAlert, SosClosureReason } from "../types";
import { formatDateTime } from "../services/geo";
import { translate, type Locale } from "../services/i18n";
import { sosText } from "../services/sosCopy";
import { SosRequestActions } from "./SosRequestActions";

export function TouristSosRequests({ alerts, locale, onClose }: { alerts: SosAlert[]; locale: Locale; onClose: (id: string, reason: SosClosureReason) => void }) {
  const [showAll, setShowAll] = useState(false);
  const active = alerts.filter((alert) => alert.status !== "resolved");
  const closed = alerts.filter((alert) => alert.status === "resolved");
  const record = (alert: SosAlert) => <article className="safety-record-item" key={alert.id}>
    <strong>SOS · {alert.status === "resolved" ? sosText(locale, alert.closureReason === "cancelled" ? "cancelled" : "resolved") : translate(locale, alert.status === "reviewing" ? "common.waiting" : "common.active")}</strong>
    <span>{formatDateTime(alert.createdAt, locale)}</span>
    {alert.adminNote && <span>{alert.adminNote}</span>}
    {alert.status !== "resolved" && <SosRequestActions locale={locale} onClose={(reason) => onClose(alert.id, reason)} />}
  </article>;
  if (!alerts.length) return null;
  return <section className="sos-request-list" aria-label={sosText(locale, "requests")}>
    <h3>{sosText(locale, "requests")}</h3>
    <div className="safety-record-list">{(showAll ? active : active.slice(0, 3)).map(record)}</div>
    {active.length > 3 && <button className="secondary-action compact-action" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{sosText(locale, showAll ? "showLess" : "showMore")} ({active.length})</button>}
    {closed.length > 0 && <details className="sos-closed-history">
      <summary>{sosText(locale, "history")} ({closed.length})</summary>
      <p>{sosText(locale, "newRequest")}</p>
      <div className="safety-record-list">{(showAll ? closed : closed.slice(0, 3)).map(record)}</div>
      {closed.length > 3 && <button className="secondary-action compact-action" type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{sosText(locale, showAll ? "showLess" : "showMore")}</button>}
    </details>}
  </section>;
}
