import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Destination, DestinationCategory, MovementPoint } from "../types";

type MapViewProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
};

const categoryLabels: Record<DestinationCategory, string> = {
  cultural: "C",
  nature: "N",
  urban: "U",
  heritage: "H",
  food: "F",
  coastal: "B",
};

function escapeHtml(value: string) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function icon(className: string, label: string) {
  return L.divIcon({
    className,
    html: `<span>${label}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MapView({ points, destinations, activePoint }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    try {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
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

    destinations.forEach((destination) => {
      L.marker([destination.latitude, destination.longitude], {
        icon: icon(`destination-marker destination-marker-${destination.category}`, categoryLabels[destination.category]),
        title: destination.name,
      })
        .bindPopup(`<strong>${escapeHtml(destination.name)}</strong><br>${escapeHtml(destination.category)}<br>${escapeHtml(destination.city)}`)
        .addTo(layer);
    });

    if (route.length > 0) {
      L.polyline(route, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.78,
      }).addTo(layer);

      points.forEach((point, index) => {
        L.circleMarker([point.latitude, point.longitude], {
          radius: index === points.length - 1 ? 8 : 5,
          color: "#0f172a",
          fillColor: index === points.length - 1 ? "#22c55e" : "#38bdf8",
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`Movement point ${index + 1}<br>${new Date(point.recordedAt).toLocaleString()}`)
          .addTo(layer);
      });

      map.fitBounds(L.latLngBounds(route), { padding: [36, 36], maxZoom: 15 });
    } else if (activePoint) {
      map.setView([activePoint.latitude, activePoint.longitude], 15);
    }

    if (activePoint) {
      L.circleMarker([activePoint.latitude, activePoint.longitude], {
        radius: 10,
        color: "#ffffff",
        fillColor: "#0f766e",
        fillOpacity: 1,
        weight: 3,
      })
        .bindPopup("Current location")
        .addTo(layer);
    }

    return () => {
      layer.remove();
    };
  }, [points, destinations, activePoint]);

  const centerOnActivePoint = () => {
    if (!activePoint) {
      return;
    }

    mapRef.current?.setView([activePoint.latitude, activePoint.longitude], 16);
  };

  return (
    <div className="map-frame">
      <div ref={containerRef} className="map-view" aria-label="Movement map" />
      {mapStatus !== "ready" && <div className="map-status">{mapStatus === "loading" ? "Loading map" : "Map tiles could not be loaded"}</div>}
      {activePoint && (
        <button className="map-current-button" type="button" onClick={centerOnActivePoint}>
          Centre on current location
        </button>
      )}
      <div className="map-legend" aria-label="Destination marker categories">
        {Object.entries(categoryLabels).map(([category, label]) => (
          <span key={category}>
            <i className={`destination-marker destination-marker-${category}`}>
              <span>{label}</span>
            </i>
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}
