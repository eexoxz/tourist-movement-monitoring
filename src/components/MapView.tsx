import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { addMapResetControl } from "../services/mapResetControl";
import { LocateFixed, MapPinned, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Destination, DestinationCategory, DestinationDemand, MovementPoint } from "../types";
import { distanceKm, formatDateTime } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { createDestinationSignalCalculator, emptyDestinationSignal, type DestinationSignal } from "../services/mapSignals";
import { DestinationVisual } from "./DestinationVisual";
import { PlacePracticalInfo } from "./PlacePracticalInfo";
import { PlaceGuideDialog } from "./PlaceGuideDialog";
import { discoveryText } from "../services/discoveryCopy";
import { activityText } from "../services/activityCopy";
import { MovementCanvasLayer } from "./MovementCanvasLayer";
import { groupMapDestinations } from "../services/movementMapGeometry";
import { mapDisplayText } from "../services/mapDisplayCopy";
import { bindMalaysiaMapLimits, malaysiaMapOptions, malaysiaViewBounds } from "../services/malaysiaMap";
import type { MapFocusTarget } from "./MovementMap";
import { uiText } from "../services/uiText";
import { categoryIconMarkup, type CategoryIconSize } from "../generated/mapIconMarkup";

type MapViewProps = {
  focusTarget?: MapFocusTarget;
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
  displayMode?: "route" | "signals";
  locale?: Locale;
  isBrowsingArea?: boolean;
  activityDemand?: DestinationDemand[];
};

const categoryMeta: Record<DestinationCategory, { labelKey: TranslationKey }> = {
  cultural: { labelKey: "category.cultural" },
  nature: { labelKey: "category.nature" },
  urban: { labelKey: "category.urban" },
  heritage: { labelKey: "category.heritage" },
  food: { labelKey: "category.food" },
  coastal: { labelKey: "category.coastal" },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function categoryIconHtml(category: DestinationCategory, size: CategoryIconSize) {
  return categoryIconMarkup[category][size];
}

function tierLabelKey(tier: DestinationSignal["tier"]): TranslationKey {
  return `map.tier.${tier}`;
}

function crowdLabelKey(signal: DestinationSignal): TranslationKey {
  if (signal.tier === "high") {
    return "map.crowd.busy";
  }

  if (signal.tier === "medium") {
    return "map.crowd.steady";
  }

  if (signal.tier === "emerging") {
    return "map.crowd.growing";
  }

  return "map.crowd.quiet";
}

function destinationIcon(category: DestinationCategory, signal: DestinationSignal, showCounts: boolean, selected = false) {
  const badge = showCounts && signal.nearbyPointCount > 0 ? `<b>${signal.nearbyPointCount > 999 ? "999+" : signal.nearbyPointCount}</b>` : "";
  return L.divIcon({ className: `destination-marker destination-marker-${category} destination-marker-compact${selected ? " destination-marker-selected" : ""}`, html: `<span>${categoryIconHtml(category, selected ? 18 : 15)}</span>${badge}`, iconSize: selected ? [36, 42] : [28, 34], iconAnchor: selected ? [18, 40] : [14, 32] });
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

export function MapView({ points, destinations, activePoint, mode = "admin", displayMode = "route", locale = "en", isBrowsingArea = false, activityDemand, focusTarget }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const movementLayerRef = useRef<MovementCanvasLayer | null>(null);
  const focusLayerRef = useRef<L.LayerGroup | null>(null);
  const focusCircleRef = useRef<L.Circle | null>(null);
  const lastRequestedFocus = useRef<number | null>(null);
  const lastRevealedFocus = useRef<number | null>(null);
  const renderDestinationsRef = useRef<(() => void) | null>(null);
  const signalsRef = useRef<Map<string, DestinationSignal>>(new Map());
  const [placeGroup, setPlaceGroup] = useState<Destination[] | null>(null);
  const lastAutoFocusKeyRef = useRef("");
  const manualBrowseRef = useRef(false);
  const automaticViewRef = useRef(false);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [expandedDestinationId, setExpandedDestinationId] = useState<string | null>(null);
  const [dismissedPreviewId, setDismissedPreviewId] = useState<string | null>(null);
  const [routePopupOpen, setRoutePopupOpen] = useState(false);
  const visibleDestinations = useMemo(() => {
    if (mode !== "tourist") {
      return destinations;
    }

    const limit = points.length > 0 || activePoint ? 12 : 8;
    const rankedDestinations = activePoint
      ? destinations
          .map((destination) => ({ destination, distance: distanceKm(activePoint, destination) }))
          .sort((a, b) => a.distance - b.distance)
          .map((row) => row.destination)
      : destinations;

    return rankedDestinations.slice(0, limit);
  }, [activePoint, destinations, mode, points.length]);
  const calculateSignals = useMemo(() => createDestinationSignalCalculator(), []);
  const destinationSignals = useMemo(() => calculateSignals(visibleDestinations, points, activePoint, activityDemand), [activePoint, points, visibleDestinations, activityDemand]);
  signalsRef.current = destinationSignals;
  const selectedDestination = visibleDestinations.find((destination) => destination.id === selectedDestinationId) ?? null;
  const selectedSignal = selectedDestination ? destinationSignals.get(selectedDestination.id) : null;
  const t = (key: TranslationKey) => translate(locale, key);
  const categoryLabel = (category: DestinationCategory) => t(categoryMeta[category].labelKey);
  const signalTierLabel = (tier: DestinationSignal["tier"]) => t(tierLabelKey(tier));

  useEffect(() => {
    if (selectedDestinationId && !visibleDestinations.some((destination) => destination.id === selectedDestinationId)) {
      setSelectedDestinationId(null);
      setExpandedDestinationId(null);
    }
  }, [selectedDestinationId, visibleDestinations]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let releaseLimits: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;
    try {
      mapRef.current = L.map(containerRef.current, {
        ...malaysiaMapOptions,
        // Zoom transition timers can outlive a map removed by page navigation.
        zoomAnimation: false,
        dragging: true,
        zoomControl: false,
        attributionControl: true,
        scrollWheelZoom: "center",
        wheelPxPerZoomLevel: 100,
        touchZoom: true,
        preferCanvas: true,
      }).setView([3.1478, 101.6937], 13);
      const map = mapRef.current;
      releaseLimits = bindMalaysiaMapLimits(map);
      resizeObserver = new ResizeObserver(() => map.invalidateSize({ animate: false, pan: false }));
      resizeObserver.observe(containerRef.current);
      mapRef.current.on("dragstart", () => { manualBrowseRef.current = true; });
      mapRef.current.on("zoomstart", () => { if (!automaticViewRef.current) manualBrowseRef.current = true; });
      mapRef.current.on("popupopen", () => setRoutePopupOpen(true));
      mapRef.current.on("popupclose", () => setRoutePopupOpen(false));

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        noWrap: true,
        updateWhenZooming: false,
        updateWhenIdle: true,
        attribution: "&copy; OpenStreetMap contributors",
      })
        .on("load", () => setMapStatus("ready"))
        .on("tileerror", () => setMapStatus("error"))
        .addTo(mapRef.current);
    } catch {
      setMapStatus("error");
    }

    return () => {
      resizeObserver?.disconnect();
      releaseLimits?.();
      mapRef.current?.stop();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const controls = containerRef.current;
    for (const [selector, source] of [[".leaflet-control-zoom-in", "Zoom in"], [".leaflet-control-zoom-out", "Zoom out"]]) {
      const control = controls?.querySelector(selector);
      control?.setAttribute("title", uiText(locale, source));
      control?.setAttribute("aria-label", uiText(locale, source));
    }
  }, [locale]);

  useEffect(() => {
    manualBrowseRef.current = false;
    lastAutoFocusKeyRef.current = "";
    mapRef.current?.closePopup();
    setSelectedDestinationId(null); setExpandedDestinationId(null); setPlaceGroup(null);
    focusLayerRef.current?.remove();
  }, [points[0]?.tripId, isBrowsingArea ? activePoint?.id : undefined]);

  // Destination geometry survives GPS updates. Reconcile only the marker groups that
  // enter/leave the viewport; zooming reveals smaller groups without discarding places.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    const markers = new Map<string, { marker: L.Marker; signature: string }>();
    let zoom = NaN;
    let groups: ReturnType<typeof groupMapDestinations> = [];
    const selectDestination = (destination: Destination) => {
      map.closePopup(); setSelectedDestinationId(destination.id); setExpandedDestinationId(null);
      setDismissedPreviewId(null); setPlaceGroup(null); manualBrowseRef.current = true;
      map.panTo([destination.latitude, destination.longitude], { animate: false });
    };
    const render = () => {
      const currentZoom = map.getZoom();
      if (currentZoom !== zoom) { zoom = currentZoom; groups = groupMapDestinations(visibleDestinations, zoom, 66, mode === "admin" ? selectedDestinationId : null); }
      const bounds = map.getBounds().pad(.2), wanted = new Set<string>();
      for (const group of groups) {
        if (!bounds.contains([group.latitude, group.longitude])) continue;
        wanted.add(group.key);
        const single = group.places.length === 1 ? group.places[0] : null;
        const signal = single ? signalsRef.current.get(single.id) ?? emptyDestinationSignal() : null;
        const isSelected = Boolean(single && single.id === selectedDestinationId);
        const signature = single ? `${single.category}:${isSelected}:${zoom >= 11 ? signal!.nearbyPointCount : ""}` : String(group.places.length);
        const previous = markers.get(group.key);
        if (previous && previous.signature === signature) continue;
        const title = single ? single.name : mapDisplayText(locale, "places", { count: group.places.length });
        const icon = single ? destinationIcon(single.category, signal!, mode !== "tourist" && zoom >= 11, isSelected) : L.divIcon({ className: "destination-cluster", html: `<strong>${new Intl.NumberFormat(locale).format(group.places.length)}</strong>`, iconSize: [44, 44], iconAnchor: [22, 22] });
        if (previous) { previous.marker.setIcon(icon); previous.marker.getElement()?.setAttribute("aria-pressed", String(isSelected)); previous.signature = signature; continue; }
        const marker = L.marker([group.latitude, group.longitude], { icon, title, alt: title, zIndexOffset: single?.id === selectedDestinationId ? 500 : single ? 200 : 300 });
        marker.on("click", () => {
          if (single) { selectDestination(single); return; }
          manualBrowseRef.current = true; map.closePopup();
          const placeBounds = L.latLngBounds(group.places.map((place) => [place.latitude, place.longitude] as [number, number]));
          if (map.getZoom() >= 17 || placeBounds.getNorthEast().distanceTo(placeBounds.getSouthWest()) < 5) setPlaceGroup(group.places);
          else {
            setPlaceGroup(null);
            const previousZoom = map.getZoom();
            map.fitBounds(placeBounds, { padding: [48, 48], maxZoom: Math.min(18, previousZoom + 3), animate: false });
            // A broad cluster on a narrow screen may already fill its bounds.
            // Always make progress towards individual places when it is tapped.
            if (map.getZoom() <= previousZoom) map.setView([group.latitude, group.longitude], Math.min(18, previousZoom + 1), { animate: false });
          }
        });
        if (isSelected) marker.bindTooltip(escapeHtml(title), { permanent: true, direction: "top", offset: [0, -44], className: "map-selected-label", opacity: 1 });
        marker.addTo(layer);
        if (single) marker.getElement()?.setAttribute("aria-pressed", String(isSelected));
        markers.set(group.key, { marker, signature });
      }
      for (const [key, value] of markers) if (!wanted.has(key)) { layer.removeLayer(value.marker); markers.delete(key); }
    };
    renderDestinationsRef.current = render;
    map.on("moveend zoomend", render); render();
    return () => { map.off("moveend zoomend", render); layer.remove(); markers.clear(); renderDestinationsRef.current = null; };
  }, [visibleDestinations, locale, mode, selectedDestinationId]);

  useEffect(() => { renderDestinationsRef.current?.(); }, [destinationSignals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = new MovementCanvasLayer().addTo(map);
    movementLayerRef.current = layer;
    return () => { layer.remove(); movementLayerRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current, layer = movementLayerRef.current;
    if (!map || !layer) return;
    layer.onSelect = (point, index) => {
      setPlaceGroup(null);
      L.popup().setLatLng([point.latitude, point.longitude]).setContent(`<section class="map-popup"><strong>${escapeHtml(t("map.movementPoint"))} ${index + 1}</strong><span>${formatDateTime(point.recordedAt, locale)}</span><dl><div><dt>${escapeHtml(t("map.accuracy"))}</dt><dd>${point.accuracyMeters}m</dd></div><div><dt>${escapeHtml(t("map.source"))}</dt><dd>${escapeHtml(point.source)}</dd></div></dl></section>`).openOn(map);
    };
    layer.setData(points, displayMode === "route");
  }, [points, displayMode, locale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    if (displayMode === "route" && points.length > 0) {
      for (const [type, point] of [["start", points[0]], ["end", points.at(-1)!]] as const) {
        const title = t(type === "start" ? "map.tripStart" : "map.tripEnd");
        L.marker([point.latitude, point.longitude], { icon: routeIcon(type), title }).bindPopup(`<strong>${escapeHtml(title)}</strong><br>${formatDateTime(point.recordedAt, locale)}`).addTo(layer);
      }
    }
    return () => { layer.remove(); };
  }, [displayMode, points[0], points.at(-1), locale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activePoint) return;
    const marker = L.marker([activePoint.latitude, activePoint.longitude], { icon: routeIcon("current"), title: isBrowsingArea ? discoveryText(locale, "area") : t("map.currentLocation") })
      .bindPopup(`<strong>${escapeHtml(isBrowsingArea ? discoveryText(locale, "area") : t("map.currentLocation"))}</strong>${isBrowsingArea ? "" : `<br>${formatDateTime(activePoint.recordedAt, locale)}`}`).addTo(map);
    return () => { marker.remove(); };
  }, [activePoint, isBrowsingArea, locale]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const latestRoutePoint = points.at(-1);
    const autoFocusKey = activePoint && mode === "tourist"
      ? `active:${activePoint.latitude}:${activePoint.longitude}`
      : displayMode === "signals"
        ? `signals:${visibleDestinations.length}:${points.length}`
      : latestRoutePoint
        ? `route:${points.length}:${latestRoutePoint.latitude}:${latestRoutePoint.longitude}:${latestRoutePoint.recordedAt}`
        : "";

    if (autoFocusKey && autoFocusKey !== lastAutoFocusKeyRef.current) {
      const hadFocus = Boolean(lastAutoFocusKeyRef.current);
      lastAutoFocusKeyRef.current = autoFocusKey;
      if (!manualBrowseRef.current) {
        automaticViewRef.current = true;
        try {
          if (isBrowsingArea && visibleDestinations.length > 1) {
            map.fitBounds(L.latLngBounds(visibleDestinations.map((destination) => [destination.latitude, destination.longitude] as [number, number])), { padding: [36, 36], maxZoom: 12, animate: false });
          } else if (activePoint && mode === "tourist") {
            map.setView([activePoint.latitude, activePoint.longitude], hadFocus ? map.getZoom() : 15, { animate: false });
          } else if (displayMode === "route" && points.length > 0) {
            map.fitBounds(L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number])), { padding: [36, 36], maxZoom: 15, animate: false });
          } else if (displayMode === "signals" && visibleDestinations.length > 1) {
            const signalBoundDestinations = visibleDestinations.filter((destination) => (destinationSignals.get(destination.id)?.nearbyPointCount ?? 0) > 0);
            const boundsDestinations = mode === "admin" ? visibleDestinations : signalBoundDestinations.length > 1 ? signalBoundDestinations : visibleDestinations;
            const destinationBounds = mode === "admin" ? L.latLngBounds(malaysiaViewBounds) : L.latLngBounds(boundsDestinations.map((destination) => [destination.latitude, destination.longitude] as [number, number]));
            map.fitBounds(destinationBounds, { padding: [42, 42], maxZoom: 8, animate: false });
          } else if (activePoint) {
            map.setView([activePoint.latitude, activePoint.longitude], 15, { animate: false });
          }
        } finally { automaticViewRef.current = false; }
      }
    }

  }, [points, visibleDestinations, activePoint, destinationSignals, mode, displayMode, isBrowsingArea]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget || lastRequestedFocus.current === focusTarget.key) return;
    lastRequestedFocus.current = focusTarget.key;
    manualBrowseRef.current = true;
    map.closePopup(); setPlaceGroup(null); setExpandedDestinationId(null); setDismissedPreviewId(null);
    setSelectedDestinationId(focusTarget.destinationId ?? null);
    focusLayerRef.current?.remove();
    const layer = L.layerGroup().addTo(map);
    focusLayerRef.current = layer;
    if (focusTarget.radiusMeters) {
      const circle = L.circle([focusTarget.latitude, focusTarget.longitude], {
        radius: focusTarget.radiusMeters, color: "#0f766e", weight: 3, fillOpacity: .1,
      }).addTo(layer);
      focusCircleRef.current = circle;
      circle.bindTooltip(escapeHtml(uiText(locale, focusTarget.label)), { permanent: true, direction: "top" });
      map.fitBounds(circle.getBounds(), { padding: [48, 48], maxZoom: 15, animate: false });
    } else {
      focusCircleRef.current = null;
      map.setView([focusTarget.latitude, focusTarget.longitude], 15, { animate: false });
    }
    return () => { layer.remove(); focusCircleRef.current = null; };
  }, [focusTarget]);

  useEffect(() => {
    // Reveal only after React has committed the requested selection/footer.
    if (!focusTarget || lastRevealedFocus.current === focusTarget.key || selectedDestinationId !== (focusTarget.destinationId ?? null)) return;
    const surface = containerRef.current;
    if (!surface) return;
    lastRevealedFocus.current = focusTarget.key;
    surface.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, window.scrollY + surface.getBoundingClientRect().top - 20), behavior: "instant" });
  }, [focusTarget, selectedDestinationId]);

  useEffect(() => {
    if (focusTarget) focusCircleRef.current?.setTooltipContent(escapeHtml(uiText(locale, focusTarget.label)));
  }, [locale, focusTarget]);

  const centerOnActivePoint = () => {
    if (!activePoint) {
      return;
    }

    manualBrowseRef.current = false;
    automaticViewRef.current = true;
    try { mapRef.current?.setView([activePoint.latitude, activePoint.longitude], 16, { animate: false }); }
    finally { automaticViewRef.current = false; }
  };

  const sourceCounts = useMemo(() => {
    const counts = { real: 0, sample: 0 };
    for (const point of points) if (point.source === "browser") counts.real++; else if (point.source === "demo") counts.sample++;
    return counts;
  }, [points]);
  const resetView = useRef<() => void>(() => {});
  useEffect(() => {
    const map = mapRef.current;
    if (map) return addMapResetControl(map, locale, () => resetView.current());
  }, [locale]);
  resetView.current = () => {
    const map = mapRef.current;
    if (!map) return;
    manualBrowseRef.current = true;
    setPlaceGroup(null); setSelectedDestinationId(null); setExpandedDestinationId(null);
    focusLayerRef.current?.remove(); map.closePopup();
    if (displayMode === "route" && points.length) map.fitBounds(L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number])), { padding: [36, 36], maxZoom: 15, animate: false });
    else if (mode === "admin") map.fitBounds(malaysiaViewBounds, { padding: [16, 16], maxZoom: 8, animate: false });
    else if (isBrowsingArea && visibleDestinations.length) map.fitBounds(L.latLngBounds(visibleDestinations.map((place) => [place.latitude, place.longitude] as [number, number])), { padding: [36, 36], maxZoom: 12, animate: false });
    else if (activePoint) map.setView([activePoint.latitude, activePoint.longitude], 15, { animate: false });
    else if (visibleDestinations.length === 1) map.setView([visibleDestinations[0].latitude, visibleDestinations[0].longitude], 15, { animate: false });
    else map.fitBounds(malaysiaViewBounds, { padding: [16, 16], maxZoom: 8, animate: false });
  };
  const showMalaysia = () => {
    const map = mapRef.current;
    if (!map) return;
    manualBrowseRef.current = true; setPlaceGroup(null); setSelectedDestinationId(null); setExpandedDestinationId(null);
    focusLayerRef.current?.remove();
    map.closePopup();
    map.fitBounds(malaysiaViewBounds, { padding: [16, 16], maxZoom: 8, animate: false });
  };
  const visibleCategories = useMemo(() => Array.from(new Set(visibleDestinations.map((destination) => destination.category))), [visibleDestinations]);
  const topSignals = useMemo(
    () =>
      visibleDestinations
        .map((destination) => ({
          destination,
          signal: destinationSignals.get(destination.id) ?? emptyDestinationSignal(activePoint, destination),
        }))
        .filter((row) => row.signal.nearbyPointCount > 0 || (row.signal.activityScore ?? 0) > 0)
        .sort((a, b) => (b.signal.activityScore ?? 0) - (a.signal.activityScore ?? 0) || b.signal.nearbyPointCount - a.signal.nearbyPointCount)
        .slice(0, 3),
    [activePoint, destinationSignals, visibleDestinations]
  );
  const previewDestination = selectedDestination ?? (mode === "tourist" ? topSignals[0]?.destination : undefined);
  const previewSignal = selectedSignal ?? topSignals[0]?.signal;
  const detailsExpanded = Boolean(selectedDestination && expandedDestinationId === selectedDestination.id);
  const previewDismissed = !selectedDestination && previewDestination?.id === dismissedPreviewId;

  const placeDetails = selectedDestination && selectedSignal ? <>
            <DestinationVisual destination={selectedDestination} compact locale={locale} />
            <div className="map-detail-heading">
              <span>{categoryLabel(selectedDestination.category)} {t("map.destination")}</span>
              <h2>{selectedDestination.name}</h2>
              <p>{selectedDestination.description}</p>
            </div>
            <dl className="map-visitor-details">
              <div className="wide">
                <dt>{t("common.address")}</dt>
                <dd>{selectedDestination.address ?? selectedDestination.city}</dd>
              </div>
              {selectedSignal.distanceFromActiveKm !== undefined && (
                <div>
                  <dt>{isBrowsingArea ? discoveryText(locale, "fromArea") : t("map.fromCurrentPoint")}</dt>
                  <dd>{selectedSignal.distanceFromActiveKm.toFixed(1)} km {t("map.away")}</dd>
                </div>
              )}
              <div>
                <dt>{t("common.demand")}</dt>
                <dd>{mode === "tourist" && selectedSignal.activityScore === 0 ? activityText(locale, "noEvidence") : t(crowdLabelKey(selectedSignal))}</dd>
              </div>
              {mode === "admin" && <div><dt>{t("map.movementPoints")}</dt><dd>{new Intl.NumberFormat(locale).format(selectedSignal.nearbyPointCount)}</dd></div>}
            </dl>
            <PlacePracticalInfo destination={selectedDestination} locale={locale} />
            <section className="map-visit-notes">
              {selectedDestination.visitTips && selectedDestination.visitTips.length > 0 && (
                <div>
                  <strong>{t("map.goodToKnow")}</strong>
                  <ul>
                    {selectedDestination.visitTips.slice(0, 2).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            {selectedSignal.latestRecordedAt && <small>{t("map.visitorMovementUpdated")} {formatDateTime(selectedSignal.latestRecordedAt, locale)}</small>}
  </> : null;
  const legend = (<div className="map-legend" aria-label={t("map.legendAria")}>
        {visibleCategories.map((category) => (
          <span key={category}>
            <i className={`legend-marker destination-marker-${category}`}>
              <span dangerouslySetInnerHTML={{ __html: categoryIconHtml(category, 13) }} />
            </i>
            {categoryLabel(category)}
          </span>
        ))}
      </div>);

  return (
    <div className={`map-frame${mode === "tourist" ? " tourist-map-mode" : ""}${activePoint ? " map-has-location" : ""}`}>
      <div className="map-surface">
      <div ref={containerRef} className="map-view" aria-label={t("map.aria")} />
      {mapStatus !== "ready" && <div className="map-status">{mapStatus === "loading" ? t("map.loading") : t("map.error")}</div>}
      {mode === "admin" && <>
        <div className="map-data-summary" title={mapDisplayText(locale, "overlap")}><strong>{mapDisplayText(locale, "loaded", { count: points.length })}</strong><span>{mapDisplayText(locale, "sources", sourceCounts)}</span><small>{mapDisplayText(locale, "help")}</small></div>
        <button type="button" className="map-national-button" onClick={showMalaysia} title={mapDisplayText(locale, "national")} aria-label={mapDisplayText(locale, "national")}><MapPinned size={18} /><span>{mapDisplayText(locale, "national")}</span></button>
      </>}
      {placeGroup && <section className="map-cluster-list" aria-label={mapDisplayText(locale, "group")}><button className="map-detail-close" type="button" aria-label={mapDisplayText(locale, "close")} onClick={() => setPlaceGroup(null)}><X size={16} /></button><strong>{mapDisplayText(locale, "places", { count: placeGroup.length })}</strong>{placeGroup.map((place) => <button key={place.id} className="secondary-action compact-action" type="button" onClick={() => { setSelectedDestinationId(place.id); setExpandedDestinationId(place.id); setDismissedPreviewId(null); setPlaceGroup(null); }}>{place.name}</button>)}</section>}
      {mode === "tourist" && <div className="map-mode-label">{t("map.touristMap")}</div>}
      {activePoint && (
        <button className="map-current-button" type="button" onClick={centerOnActivePoint} title={isBrowsingArea ? discoveryText(locale, "centreArea") : t("map.centerCurrentLocation")} aria-label={isBrowsingArea ? discoveryText(locale, "centreArea") : t("map.centerCurrentLocation")}>
          <LocateFixed size={18} aria-hidden="true" />
          <span>{isBrowsingArea ? discoveryText(locale, "centreArea") : t("map.centerCurrentLocation")}</span>
        </button>
      )}
      {mode === "tourist" && legend}
      {mode === "tourist" && !placeGroup && !routePopupOpen && !previewDismissed && <section className={`map-detail-panel${selectedDestination ? " visible" : ""}${detailsExpanded ? "" : " map-place-preview"}`} aria-live="polite">
        {detailsExpanded && selectedDestination && selectedSignal ? (
          <>
            <button
              className="map-detail-close"
              type="button"
              onClick={() => setExpandedDestinationId(null)}
              title={t("map.closePlaceDetails")}
              aria-label={t("map.closePlaceDetails")}
            >
              <X size={16} aria-hidden="true" />
            </button>
            {placeDetails}
          </>
        ) : previewDestination && previewSignal ? (
          <>
            <button className="map-detail-close" type="button" onClick={() => {
              setDismissedPreviewId(previewDestination.id);
              setSelectedDestinationId(null);
              setExpandedDestinationId(null);
            }} title={discoveryText(locale, "dismiss")} aria-label={discoveryText(locale, "dismiss")}>
              <X size={16} aria-hidden="true" />
            </button>
            <span>{selectedDestination ? `${categoryLabel(previewDestination.category)} · ${previewDestination.city}` : mode === "tourist" ? discoveryText(locale, "nearby") : t("map.topMapSignals")}</span>
            <h2>{previewDestination.name}</h2>
            <p className="map-preview-description">
              {mode === "tourist" ? previewDestination.description : `${t("map.movementPoints")}: ${new Intl.NumberFormat(locale).format(previewSignal.nearbyPointCount)} · ${t("map.demandSignal")}: ${signalTierLabel(previewSignal.tier)}`}
            </p>
            <div className="map-preview-actions">
              {previewSignal.distanceFromActiveKm !== undefined && <small>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(previewSignal.distanceFromActiveKm)} km {t("map.away")}</small>}
              <button className="secondary-action compact-action" type="button" onClick={() => {
                setSelectedDestinationId(previewDestination.id);
                setExpandedDestinationId(previewDestination.id);
              }}><MapPinned size={17} aria-hidden="true" />{discoveryText(locale, "view")}</button>
            </div>
          </>
        ) : (
          <>
            <span>{t("map.interactiveMap")}</span>
            <h2>{mode === "tourist" ? t("tourist.home.quickPlaces") : t("map.tapPlaceMarker")}</h2>
            <p>{mode === "tourist" ? t("common.checkLocally") : t("map.catalogueOnlyDescription")}</p>
          </>
        )}
      </section>}
      {mode === "admin" && selectedDestination && selectedSignal && !placeGroup && !routePopupOpen && <section className="admin-map-selection" aria-live="polite">
        <button type="button" className="map-detail-close" aria-label={discoveryText(locale, "dismiss")} onClick={() => { setSelectedDestinationId(null); setExpandedDestinationId(null); }}><X size={16} /></button>
        <span>{categoryLabel(selectedDestination.category)} · {selectedDestination.city}</span>
        <strong>{selectedDestination.name}</strong>
        <div className="map-preview-actions"><small>{t("map.movementPoints")}: {new Intl.NumberFormat(locale).format(selectedSignal.nearbyPointCount)}</small><button type="button" className="secondary-action compact-action" onClick={() => setExpandedDestinationId(selectedDestination.id)}><MapPinned size={17} />{discoveryText(locale, "view")}</button></div>
      </section>}
      </div>
      {mode === "admin" && legend}
      {mode === "admin" && detailsExpanded && selectedDestination && <PlaceGuideDialog title={selectedDestination.name} locale={locale} onClose={() => setExpandedDestinationId(null)} className="admin-map-place-dialog"><div className="admin-map-place-content">{placeDetails}</div></PlaceGuideDialog>}

    </div>
  );
}
