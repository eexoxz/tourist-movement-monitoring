import type { Destination, User } from "../types";
import type { Locale } from "../services/i18n";
import { activityText } from "../services/activityCopy";
import { isFreshActivitySummary, usesSampleActivity } from "../services/activitySummary";
import { ChevronDown, RefreshCw } from "lucide-react";
import { travelerStatusText } from "../services/travelerStatusCopy";

export function ActivityBasis({ destinations, user, locale, onRefresh, refreshing = false }: { destinations: Destination[]; user: User; locale: Locale; onRefresh?: () => void; refreshing?: boolean }) {
  const summary = destinations.map((destination) => destination.activitySummary).find((candidate) => isFreshActivitySummary(candidate) && candidate.popularityScore > 0);
  return <div className="activity-basis-row"><p className="activity-basis">
    {usesSampleActivity(user) ? activityText(locale, "demoBasis") : summary
      ? `${activityText(locale, "observedBasis")} ${new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(summary.updatedAt))}`
      : activityText(locale, "localBasis")}
  </p><details className="activity-basis-explanation"><summary>{activityText(locale, "title")}<ChevronDown size={16} /></summary><p>{usesSampleActivity(user) ? activityText(locale, "demoBasis") : travelerStatusText(locale, "basis")}</p></details>{onRefresh && <button className="secondary-action compact-action" type="button" onClick={onRefresh} disabled={refreshing} title={activityText(locale, "refresh")} aria-label={activityText(locale, "refresh")} aria-busy={refreshing}><RefreshCw size={16} /></button>}</div>;
}
