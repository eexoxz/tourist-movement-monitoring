import { lazy, Suspense, useMemo } from "react";
import type { Destination, DestinationDemand, MovementPoint } from "../types";
import { translate, type Locale } from "../services/i18n";
import { localizeDestinations } from "../services/destinationLocale";

const MapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));

type MovementMapProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
  displayMode?: "route" | "signals";
  locale?: Locale;
  isBrowsingArea?: boolean;
  activityDemand?: DestinationDemand[];
};

export function MovementMap({ points, destinations, activePoint, mode = "admin", displayMode = "route", locale = "en", isBrowsingArea = false, activityDemand }: MovementMapProps) {
  const localizedDestinations = useMemo(() => localizeDestinations(destinations, locale), [destinations, locale]);
  return (
    <Suspense
      fallback={
        <div className="map-frame">
          <div className="map-view map-view-placeholder" />
          <div className="map-status">{translate(locale, "map.loading")}</div>
        </div>
      }
    >
      <MapView points={points} destinations={localizedDestinations} activePoint={activePoint} mode={mode} displayMode={displayMode} locale={locale} isBrowsingArea={isBrowsingArea} activityDemand={activityDemand} />
    </Suspense>
  );
}
