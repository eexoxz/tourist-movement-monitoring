import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Destination, MovementPoint } from "../types";

type MapViewProps = {
  points: MovementPoint[];
  destinations: Destination[];
  activePoint?: MovementPoint;
};

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([3.1478, 101.6937], 13);

    L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);

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
        icon: icon("destination-marker", destination.name.slice(0, 1)),
        title: destination.name,
      })
        .bindPopup(`<strong>${destination.name}</strong><br>${destination.category}<br>${destination.city}`)
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

    return () => {
      layer.remove();
    };
  }, [points, destinations, activePoint]);

  return <div ref={containerRef} className="map-view" aria-label="Movement map" />;
}
