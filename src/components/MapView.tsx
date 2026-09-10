import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, Landmark, Trees, Utensils, Waves, X, type LucideIcon } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Destination, DestinationCategory, MovementPoint } from "../types";
import { distanceKm, formatDateTime } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { calculateDestinationSignals, emptyDestinationSignal, type DestinationSignal } from "../services/mapSignals";

type MapViewProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
  displayMode?: "route" | "signals";
  locale?: Locale;
};

const categoryMeta: Record<DestinationCategory, { Icon: LucideIcon; labelKey: TranslationKey }> = {
  cultural: { Icon: Landmark, labelKey: "category.cultural" },
  nature: { Icon: Trees, labelKey: "category.nature" },
  urban: { Icon: Building2, labelKey: "category.urban" },
  heritage: { Icon: Landmark, labelKey: "category.heritage" },
  food: { Icon: Utensils, labelKey: "category.food" },
  coastal: { Icon: Waves, labelKey: "category.coastal" },
};

function escapeHtml(value: string) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function categoryIconHtml(category: DestinationCategory, size = 16) {
  const Icon = categoryMeta[category].Icon;
  return renderToStaticMarkup(<Icon size={size} strokeWidth={2.7} aria-hidden="true" />);
}

function tierLabelKey(tier: DestinationSignal["tier"]): TranslationKey {
  return `map.tier.${tier}`;
}

function destinationIcon(category: DestinationCategory, signal: DestinationSignal, locale: Locale) {
  const meta = categoryMeta[category];
  const size = signal.tier === "high" ? 46 : signal.tier === "medium" ? 42 : signal.tier === "emerging" ? 38 : 34;
  const iconSize = Math.round(size * 0.44);
  const badgeLabel = signal.nearbyPointCount > 999 ? "999+" : signal.nearbyPointCount.toString();
  const badge = signal.nearbyPointCount > 0 ? `<b>${badgeLabel}</b>` : "";

  return L.divIcon({
    className: `destination-marker destination-marker-${category} destination-marker-${signal.tier}`,
    html: `<span>${categoryIconHtml(category, iconSize)}</span>${badge}<small>${escapeHtml(translate(locale, meta.labelKey)).toUpperCase()}</small>`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 2],
    popupAnchor: [0, -size],
  });
}

function routeIcon(type: "start" | "end" | "current") {
  return L.divIcon({
    className: `route-marker route-marker-${type}`,
    html: `<span>${type === "start" ? "S" : type === "end" ? "E" : ""}</span>`,
    iconSize: type === "current" ? [32, 32] : [24, 24],
    iconAnchor: type === "current" ? [16, 16] : [12, 12],
    popupAnchor: [0, -12],
  });
}

export function MapView({ points, destinations, activePoint, mode = "admin", displayMode = "route", locale = "en" }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const lastAutoFocusKeyRef = useRef("");
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const visibleDestinations = useMemo(() => {
    if (mode !== "tourist") {
      return destinations;
    }

    const limit = points.length > 0 || activePoint ? 12 : 8;
    const rankedDestinations = activePoint
      ? [...destinations].sort((a, b) => distanceKm(activePoint, a) - distanceKm(activePoint, b))
      : destinations;

    return rankedDestinations.slice(0, limit);
  }, [activePoint, destinations, mode, points.length]);
  const destinationSignals = useMemo(() => calculateDestinationSignals(visibleDestinations, points, activePoint), [activePoint, points, visibleDestinations]);
  const selectedDestination = visibleDestinations.find((destination) => destination.id === selectedDestinationId) ?? null;
  const selectedSignal = selectedDestination ? destinationSignals.get(selectedDestination.id) : null;
  const t = (key: TranslationKey) => translate(locale, key);
  const categoryLabel = (category: DestinationCategory) => t(categoryMeta[category].labelKey);
  const signalTierLabel = (tier: DestinationSignal["tier"]) => t(tierLabelKey(tier));

  useEffect(() => {
    if (visibleDestinations.length === 1) {
      setSelectedDestinationId(visibleDestinations[0].id);
      return;
    }

    if (selectedDestinationId && !visibleDestinations.some((destination) => destination.id === selectedDestinationId)) {
      setSelectedDestinationId(null);
    }
  }, [selectedDestinationId, visibleDestinations]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    try {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: false,
      }).setView([3.1478, 101.6937], 13);

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      })
        .on("load", () => setMapStatus("ready"))
        .on("tileerror", () => setMapStatus("error"))
        .addTo(mapRef.current);
    } catch {
      setMapStatus("error");
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const layer = L.layerGroup().addTo(map);
    const route = points.map((point) => [point.latitude, point.longitude] as [number, number]);

    visibleDestinations.forEach((destination) => {
      const signal = destinationSignals.get(destination.id) ?? emptyDestinationSignal(activePoint, destination);
      const circleRadius = signal.tier === "high" ? 620 : signal.tier === "medium" ? 520 : signal.tier === "emerging" ? 430 : 320;
      const selectDestination = () => {
        setSelectedDestinationId(destination.id);
        map.panTo([destination.latitude, destination.longitude], { animate: true });
      };

      L.circle([destination.latitude, destination.longitude], {
        radius: circleRadius,
        color: "rgba(15, 118, 110, 0.34)",
        fillColor: "rgba(15, 118, 110, 0.11)",
        fillOpacity: signal.tier === "low" ? 0.06 : 0.12,
        weight: signal.tier === "low" ? 1 : 2,
        interactive: true,
      })
        .on("click", selectDestination)
        .bindTooltip(destination.name, { direction: "top", opacity: 0.92 })
        .addTo(layer);

      const marker = L.marker([destination.latitude, destination.longitude], {
        icon: destinationIcon(destination.category, signal, locale),
        title: destination.name,
      }).on("click", selectDestination);

      if (mode !== "tourist") {
        marker.bindPopup(
          `<section class="map-popup"><strong>${escapeHtml(destination.name)}</strong><span>${escapeHtml(categoryLabel(destination.category))} · ${escapeHtml(destination.city)}</span><p>${escapeHtml(destination.description)}</p><dl><div><dt>${escapeHtml(t("map.movementPoints"))}</dt><dd>${signal.nearbyPointCount}</dd></div><div><dt>${escapeHtml(t("map.demandSignal"))}</dt><dd>${escapeHtml(signalTierLabel(signal.tier))}</dd></div></dl></section>`
        );
      }

      marker.addTo(layer);
    });

    if (displayMode === "route" && route.length > 0) {
      L.polyline(route, {
        color: "#ffffff",
        weight: 9,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      L.polyline(route, {
        color: "#0f766e",
        weight: 5,
        opacity: 0.88,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layer);

      points.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: index === points.length - 1 ? 6 : 4,
          color: "#ffffff",
          fillColor: index === points.length - 1 ? "#e85d75" : "#14b8a6",
          fillOpacity: 0.95,
          weight: 2,
        })
          .bindPopup(
            `<section class="map-popup"><strong>${escapeHtml(t("map.movementPoint"))} ${index + 1}</strong><span>${formatDateTime(point.recordedAt)}</span><dl><div><dt>${escapeHtml(t("map.accuracy"))}</dt><dd>${point.accuracyMeters}m</dd></div><div><dt>${escapeHtml(t("map.source"))}</dt><dd>${escapeHtml(point.source)}</dd></div></dl></section>`
          )
          .addTo(layer);
      });

      L.marker(route[0], { icon: routeIcon("start"), title: t("map.tripStart") }).bindPopup(`<strong>${escapeHtml(t("map.tripStart"))}</strong><br>${formatDateTime(points[0].recordedAt)}`).addTo(layer);
      L.marker(route[route.length - 1], { icon: routeIcon("end"), title: t("map.tripEnd") })
        .bindPopup(`<strong>${escapeHtml(t("map.tripEnd"))}</strong><br>${formatDateTime(points.at(-1)!.recordedAt)}`)
        .addTo(layer);
    }

    if (activePoint) {
      L.marker([activePoint.latitude, activePoint.longitude], {
        icon: routeIcon("current"),
        title: t("map.currentLocation"),
      })
        .bindPopup(`<strong>${escapeHtml(t("map.currentLocation"))}</strong><br>${formatDateTime(activePoint.recordedAt)}`)
        .addTo(layer);
    }

    const latestRoutePoint = points.at(-1);
    const autoFocusKey = displayMode === "signals"
      ? `signals:${visibleDestinations.length}:${points.length}`
      : activePoint
      ? `active:${activePoint.latitude}:${activePoint.longitude}:${activePoint.recordedAt}`
      : latestRoutePoint
        ? `route:${points.length}:${latestRoutePoint.latitude}:${latestRoutePoint.longitude}:${latestRoutePoint.recordedAt}`
        : "";

    if (autoFocusKey && autoFocusKey !== lastAutoFocusKeyRef.current) {
      lastAutoFocusKeyRef.current = autoFocusKey;

      if (activePoint && mode === "tourist") {
        map.setView([activePoint.latitude, activePoint.longitude], 15);
      } else if (displayMode === "route" && route.length > 0) {
        map.fitBounds(L.latLngBounds(route), { padding: [36, 36], maxZoom: 15 });
      } else if (displayMode === "signals" && visibleDestinations.length > 1) {
        const destinationBounds = L.latLngBounds(visibleDestinations.map((destination) => [destination.latitude, destination.longitude] as [number, number]));
        map.fitBounds(destinationBounds, { padding: [42, 42], maxZoom: 8 });
      } else if (activePoint) {
        map.setView([activePoint.latitude, activePoint.longitude], 15);
      }
    }

    return () => {
      layer.remove();
    };
  }, [points, visibleDestinations, activePoint, destinationSignals, locale, mode, displayMode]);

  const centerOnActivePoint = () => {
    if (!activePoint) {
      return;
    }

    mapRef.current?.setView([activePoint.latitude, activePoint.longitude], 16);
  };

  const visibleCategories = Array.from(new Set(visibleDestinations.map((destination) => destination.category)));
  const topSignals = [...visibleDestinations]
    .map((destination) => ({
      destination,
      signal: destinationSignals.get(destination.id) ?? emptyDestinationSignal(activePoint, destination),
    }))
    .filter((row) => row.signal.nearbyPointCount > 0)
    .sort((a, b) => b.signal.nearbyPointCount - a.signal.nearbyPointCount)
    .slice(0, 3);

  return (
    <div className={mode === "tourist" ? "map-frame tourist-map-mode" : "map-frame"}>
      <div ref={containerRef} className="map-view" aria-label={t("map.aria")} />
      {mapStatus !== "ready" && <div className="map-status">{mapStatus === "loading" ? t("map.loading") : t("map.error")}</div>}
      {mode === "tourist" && <div className="map-mode-label">{t("map.touristMap")}</div>}
      {activePoint && (
        <button className="map-current-button" type="button" onClick={centerOnActivePoint}>
          {t("map.centerCurrentLocation")}
        </button>
      )}
      <div className="map-legend" aria-label={t("map.legendAria")}>
        {visibleCategories.map((category) => (
          <span key={category}>
            <i className={`destination-marker destination-marker-${category}`}>
              <span dangerouslySetInnerHTML={{ __html: categoryIconHtml(category, 13) }} />
            </i>
            {categoryLabel(category)}
          </span>
        ))}
      </div>
      <section className={selectedDestination ? "map-detail-panel visible" : "map-detail-panel"} aria-live="polite">
        {selectedDestination && selectedSignal ? (
          <>
            <button
              className="map-detail-close"
              type="button"
              onClick={() => setSelectedDestinationId(null)}
              title={t("map.closePlaceDetails")}
              aria-label={t("map.closePlaceDetails")}
            >
              <X size={16} aria-hidden="true" />
            </button>
            <span>{categoryLabel(selectedDestination.category)} {t("map.destination")}</span>
            <h2>{selectedDestination.name}</h2>
            <p>{selectedDestination.description}</p>
            <dl>
              <div>
                <dt>{t("tourist.places.area")}</dt>
                <dd>{selectedDestination.city}</dd>
              </div>
              <div>
                <dt>{t("map.demandSignal")}</dt>
                <dd>{signalTierLabel(selectedSignal.tier)}</dd>
              </div>
              <div>
                <dt>{t("map.nearbyPoints")}</dt>
                <dd>{selectedSignal.nearbyPointCount}</dd>
              </div>
              <div>
                <dt>{t("map.touristProfiles")}</dt>
                <dd>{selectedSignal.uniqueTouristCount}</dd>
              </div>
              {selectedSignal.distanceFromActiveKm !== undefined && (
                <div>
                  <dt>{t("map.fromCurrentPoint")}</dt>
                  <dd>{selectedSignal.distanceFromActiveKm.toFixed(2)} km</dd>
                </div>
              )}
              <div>
                <dt>{t("map.suggestedVisit")}</dt>
                <dd>{selectedDestination.averageVisitMinutes} {t("common.minutes")}</dd>
              </div>
            </dl>
            {selectedSignal.latestRecordedAt && <small>{t("map.latestRouteSignal")}: {formatDateTime(selectedSignal.latestRecordedAt)}</small>}
          </>
        ) : topSignals.length > 0 ? (
          <>
            <span>{mode === "tourist" ? t("map.nearbyMovement") : t("map.topMapSignals")}</span>
            <h2>{topSignals[0].destination.name}</h2>
            <p>
              {topSignals[0].signal.nearbyPointCount} {t("common.points")} {t("map.nearbyMovementDescription")}
            </p>
          </>
        ) : (
          <>
            <span>{t("map.interactiveMap")}</span>
            <h2>{t("map.tapPlaceMarker")}</h2>
            <p>{t("map.catalogueOnlyDescription")}</p>
          </>
        )}
      </section>
    </div>
  );
}
