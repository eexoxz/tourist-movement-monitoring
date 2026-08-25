import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2, Landmark, Trees, Utensils, Waves, X, type LucideIcon } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Destination, DestinationCategory, MovementPoint } from "../types";
import { distanceKm, formatDateTime } from "../services/geo";

type MapViewProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
};

type DestinationSignal = {
  nearbyPointCount: number;
  uniqueTouristCount: number;
  latestRecordedAt?: string;
  distanceFromActiveKm?: number;
  tier: "high" | "medium" | "emerging" | "low";
};

const categoryMeta: Record<DestinationCategory, { Icon: LucideIcon; name: string }> = {
  cultural: { Icon: Landmark, name: "Cultural" },
  nature: { Icon: Trees, name: "Nature" },
  urban: { Icon: Building2, name: "Urban" },
  heritage: { Icon: Landmark, name: "Heritage" },
  food: { Icon: Utensils, name: "Food" },
  coastal: { Icon: Waves, name: "Coastal" },
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

function getDestinationSignal(destination: Destination, points: MovementPoint[], activePoint?: MovementPoint): DestinationSignal {
  const nearbyPoints = points.filter((point) => distanceKm(point, destination) <= 1.2);
  const uniqueTouristIds = new Set(nearbyPoints.map((point) => point.userId || point.tripId));
  const latestPoint = [...nearbyPoints].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const nearbyPointCount = nearbyPoints.length;
  const uniqueTouristCount = uniqueTouristIds.size;
  const tier =
    nearbyPointCount >= 12 || uniqueTouristCount >= 5
      ? "high"
      : nearbyPointCount >= 6 || uniqueTouristCount >= 3
        ? "medium"
        : nearbyPointCount >= 2 || uniqueTouristCount >= 1
          ? "emerging"
          : "low";

  return {
    nearbyPointCount,
    uniqueTouristCount,
    latestRecordedAt: latestPoint?.recordedAt,
    distanceFromActiveKm: activePoint ? distanceKm(activePoint, destination) : undefined,
    tier,
  };
}

function destinationIcon(category: DestinationCategory, signal: DestinationSignal) {
  const meta = categoryMeta[category];
  const size = signal.tier === "high" ? 46 : signal.tier === "medium" ? 42 : signal.tier === "emerging" ? 38 : 34;
  const iconSize = Math.round(size * 0.44);
  const badge = signal.nearbyPointCount > 0 ? `<b>${signal.nearbyPointCount}</b>` : "";

  return L.divIcon({
    className: `destination-marker destination-marker-${category} destination-marker-${signal.tier}`,
    html: `<span>${categoryIconHtml(category, iconSize)}</span>${badge}<small>${meta.name}</small>`,
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

export function MapView({ points, destinations, activePoint, mode = "admin" }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const visibleDestinations = useMemo(
    () => (mode === "tourist" ? destinations.slice(0, points.length > 0 || activePoint ? 12 : 8) : destinations),
    [activePoint, destinations, mode, points.length]
  );
  const destinationSignals = useMemo(
    () => new Map(visibleDestinations.map((destination) => [destination.id, getDestinationSignal(destination, points, activePoint)])),
    [activePoint, points, visibleDestinations]
  );
  const selectedDestination = visibleDestinations.find((destination) => destination.id === selectedDestinationId) ?? null;
  const selectedSignal = selectedDestination ? destinationSignals.get(selectedDestination.id) : null;

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
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
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
      const signal = destinationSignals.get(destination.id) ?? getDestinationSignal(destination, points, activePoint);
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

      L.marker([destination.latitude, destination.longitude], {
        icon: destinationIcon(destination.category, signal),
        title: destination.name,
      })
        .bindPopup(
          `<section class="map-popup"><strong>${escapeHtml(destination.name)}</strong><span>${escapeHtml(categoryMeta[destination.category].name)} destination in ${escapeHtml(destination.city)}</span><p>${escapeHtml(destination.description)}</p><dl><div><dt>Movement points</dt><dd>${signal.nearbyPointCount}</dd></div><div><dt>Demand signal</dt><dd>${signal.tier}</dd></div></dl></section>`
        )
        .on("click", selectDestination)
        .addTo(layer);
    });

    if (route.length > 0) {
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
            `<section class="map-popup"><strong>Movement point ${index + 1}</strong><span>${formatDateTime(point.recordedAt)}</span><dl><div><dt>Accuracy</dt><dd>${point.accuracyMeters}m</dd></div><div><dt>Source</dt><dd>${point.source}</dd></div></dl></section>`
          )
          .addTo(layer);
      });

      L.marker(route[0], { icon: routeIcon("start"), title: "Trip start" }).bindPopup(`<strong>Trip start</strong><br>${formatDateTime(points[0].recordedAt)}`).addTo(layer);
      L.marker(route[route.length - 1], { icon: routeIcon("end"), title: "Trip end" })
        .bindPopup(`<strong>Trip end</strong><br>${formatDateTime(points.at(-1)!.recordedAt)}`)
        .addTo(layer);

      map.fitBounds(L.latLngBounds(route), { padding: [36, 36], maxZoom: 15 });
    } else if (activePoint) {
      map.setView([activePoint.latitude, activePoint.longitude], 15);
    }

    if (activePoint) {
      L.marker([activePoint.latitude, activePoint.longitude], {
        icon: routeIcon("current"),
        title: "Current location",
      })
        .bindPopup(`<strong>Current location</strong><br>${formatDateTime(activePoint.recordedAt)}`)
        .addTo(layer);
    }

    return () => {
      layer.remove();
    };
  }, [points, visibleDestinations, activePoint, destinationSignals]);

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
      signal: destinationSignals.get(destination.id) ?? getDestinationSignal(destination, points, activePoint),
    }))
    .filter((row) => row.signal.nearbyPointCount > 0)
    .sort((a, b) => b.signal.nearbyPointCount - a.signal.nearbyPointCount)
    .slice(0, 3);

  return (
    <div className={mode === "tourist" ? "map-frame tourist-map-mode" : "map-frame"}>
      <div ref={containerRef} className="map-view" aria-label="Movement map" />
      {mapStatus !== "ready" && <div className="map-status">{mapStatus === "loading" ? "Loading map" : "Map tiles could not be loaded"}</div>}
      {mode === "tourist" && <div className="map-mode-label">Tourist map</div>}
      {activePoint && (
        <button className="map-current-button" type="button" onClick={centerOnActivePoint}>
          Centre on current location
        </button>
      )}
      <div className="map-legend" aria-label="Visible destination marker categories">
        {visibleCategories.map((category) => (
          <span key={category}>
            <i className={`destination-marker destination-marker-${category}`}>
              <span dangerouslySetInnerHTML={{ __html: categoryIconHtml(category, 13) }} />
            </i>
            {categoryMeta[category].name}
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
              title="Close place details"
              aria-label="Close place details"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <span>{categoryMeta[selectedDestination.category].name} destination</span>
            <h2>{selectedDestination.name}</h2>
            <p>{selectedDestination.description}</p>
            <dl>
              <div>
                <dt>City</dt>
                <dd>{selectedDestination.city}</dd>
              </div>
              <div>
                <dt>Movement signal</dt>
                <dd>{selectedSignal.tier}</dd>
              </div>
              <div>
                <dt>Nearby points</dt>
                <dd>{selectedSignal.nearbyPointCount}</dd>
              </div>
              <div>
                <dt>Tourist profiles</dt>
                <dd>{selectedSignal.uniqueTouristCount}</dd>
              </div>
              {selectedSignal.distanceFromActiveKm !== undefined && (
                <div>
                  <dt>From current point</dt>
                  <dd>{selectedSignal.distanceFromActiveKm.toFixed(2)} km</dd>
                </div>
              )}
              <div>
                <dt>Suggested visit</dt>
                <dd>{selectedDestination.averageVisitMinutes} min</dd>
              </div>
            </dl>
            {selectedSignal.latestRecordedAt && <small>Latest route signal: {formatDateTime(selectedSignal.latestRecordedAt)}</small>}
          </>
        ) : topSignals.length > 0 ? (
          <>
            <span>{mode === "tourist" ? "Nearby movement" : "Top map signals"}</span>
            <h2>{topSignals[0].destination.name}</h2>
            <p>
              {topSignals[0].signal.nearbyPointCount} movement point(s) are near this destination. Click any place marker or shaded area to inspect it.
            </p>
          </>
        ) : (
          <>
            <span>Interactive map</span>
            <h2>Tap a place marker</h2>
            <p>Destination details are shown from the app catalogue without using extra place APIs.</p>
          </>
        )}
      </section>
    </div>
  );
}
