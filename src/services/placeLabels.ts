import type { DestinationDemand } from "../types";
import type { Locale, TranslationKey } from "./i18n";
import { activityText } from "./activityCopy";

export function formatDistanceLabel(distance: number | undefined, t: (key: TranslationKey) => string) {
  if (distance === undefined) return t("tourist.places.locationNotActive");
  return distance < 1 ? `${Math.round(distance * 1000)} ${t("tourist.places.mAway")}` : `${distance.toFixed(1)} ${t("tourist.places.kmAway")}`;
}

export function formatDemandLabel(row: DestinationDemand | undefined, locale: Locale, t: (key: TranslationKey) => string) {
  if (!row || row.popularityScore <= 0) return activityText(locale, "noEvidence");
  return `${t(`map.tier.${row.tier}` as TranslationKey)} ${t("common.demand").toLowerCase()}`;
}
