import { lazy, Suspense } from "react";
import type { Destination, MovementPoint } from "../types";
import { translate, type Locale } from "../services/i18n";

const MapView = lazy(() => import("./MapView").then((module) => ({ default: module.MapView })));

type MovementMapProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
  locale?: Locale;
};

export function MovementMap({ points, destinations, activePoint, mode = "admin", locale = "en" }: MovementMapProps) {
  return (
    <Suspense
      fallback={
        <div className="map-frame">
          <div className="map-view map-view-placeholder" />
          <div className="map-status">{translate(locale, "map.loading")}</div>
        </div>
      }
    >
      <MapView points={points} destinations={destinations} activePoint={activePoint} mode={mode} locale={locale} />
    </Suspense>
  );
}
