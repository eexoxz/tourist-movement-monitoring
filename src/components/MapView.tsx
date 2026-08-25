import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Destination, DestinationCategory, MovementPoint } from "../types";

type MapViewProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
  mode?: "tourist" | "admin";
};

const categoryMeta: Record<DestinationCategory, { label: string; name: string }> = {
  cultural: { label: "C", name: "Cultural" },
  nature: { label: "N", name: "Nature" },
  urban: { label: "U", name: "Urban" },
  heritage: { label: "H", name: "Heritage" },
  food: { label: "F", name: "Food" },
  coastal: { label: "B", name: "Coastal" },
};

function escapeHtml(value: string) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function destinationIcon(category: DestinationCategory) {
  const meta = categoryMeta[category];

  return L.divIcon({
    className: `destination-marker destination-marker-${category}`,
    html: `<span>${meta.label}</span>`,
    iconSize: [34, 40],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
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
  const visibleDestinations = useMemo(
    () => (mode === "tourist" ? destinations.slice(0, points.length > 0 || activePoint ? 12 : 8) : destinations),
    [activePoint, destinations, mode, points.length]
  );

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
      L.marker([destination.latitude, destination.longitude], {
        icon: destinationIcon(destination.category),
        title: destination.name,
      })
        .bindPopup(
          `<strong>${escapeHtml(destination.name)}</strong><br>${escapeHtml(categoryMeta[destination.category].name)} destination<br>${escapeHtml(destination.city)}`
        )
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
          .bindPopup(`Movement point ${index + 1}<br>${new Date(point.recordedAt).toLocaleString()}`)
          .addTo(layer);
      });

      L.marker(route[0], { icon: routeIcon("start"), title: "Trip start" }).bindPopup("Trip start").addTo(layer);
      L.marker(route[route.length - 1], { icon: routeIcon("end"), title: "Trip end" }).bindPopup("Trip end").addTo(layer);

      map.fitBounds(L.latLngBounds(route), { padding: [36, 36], maxZoom: 15 });
    } else if (activePoint) {
      map.setView([activePoint.latitude, activePoint.longitude], 15);
    }

    if (activePoint) {
      L.marker([activePoint.latitude, activePoint.longitude], {
        icon: routeIcon("current"),
        title: "Current location",
      })
        .bindPopup("Current location")
        .addTo(layer);
    }

    return () => {
      layer.remove();
    };
  }, [points, visibleDestinations, activePoint]);

  const centerOnActivePoint = () => {
    if (!activePoint) {
      return;
    }

    mapRef.current?.setView([activePoint.latitude, activePoint.longitude], 16);
  };

  const visibleCategories = Array.from(new Set(visibleDestinations.map((destination) => destination.category)));

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
              <span>{categoryMeta[category].label}</span>
            </i>
            {categoryMeta[category].name}
          </span>
        ))}
      </div>
    </div>
  );
}
