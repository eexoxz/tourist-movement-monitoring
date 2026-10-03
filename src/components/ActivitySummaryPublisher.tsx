import { FlaskConical, RefreshCw } from "lucide-react";
import type { Destination } from "../types";
import type { Locale } from "../services/i18n";
import { activityText } from "../services/activityCopy";

export function ActivitySummaryPublisher({ destinations, locale, onPublish }: { destinations: Destination[]; locale: Locale; onPublish: (source: "browser" | "demo") => void }) {
  const publishedAt = destinations.find((destination) => Number.isFinite(Date.parse(destination.activitySummary?.updatedAt ?? "")))?.activitySummary?.updatedAt;
  return <section className="shared-activity-toolbar">
    <div>
      <h2>{activityText(locale, "title")}</h2>
      <p>{activityText(locale, "hint")}</p>
      {publishedAt && <time dateTime={publishedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(publishedAt))}</time>}
    </div>
    <div className="shared-activity-actions">
      <button className="secondary-action" type="button" onClick={() => onPublish("browser")}><RefreshCw size={18} />{activityText(locale, "publish")}</button>
      <button className="secondary-action" type="button" onClick={() => onPublish("demo")}><FlaskConical size={18} />{activityText(locale, "publishSample")}</button>
    </div>
  </section>;
}
