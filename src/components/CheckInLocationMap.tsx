import { useEffect, useRef } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import "leaflet/dist/leaflet.css";
import { uiText } from "../services/uiText";
import type { Locale } from "../services/i18n";

type Pin = { latitude: number; longitude: number; accuracyMeters?: number };
export default function CheckInLocationMap({ points, label, locale }: { points: Pin[]; label: string; locale: Locale }) {
  const element = useRef<HTMLDivElement>(null);
  const signature = points.map((point) => `${point.latitude}:${point.longitude}:${point.accuracyMeters ?? 0}`).join("|");
  useEffect(() => {
    if (!element.current || !points.length) return;
    const map = L.map(element.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tapHold: false, zoomAnimation: false });
    for (const [selector, source] of [[".leaflet-control-zoom-in", "Zoom in"], [".leaflet-control-zoom-out", "Zoom out"]]) {
      const button = element.current.querySelector<HTMLElement>(selector);
      button?.setAttribute("title", uiText(locale, source));
      button?.setAttribute("aria-label", uiText(locale, source));
    }
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({ className: "check-in-location-marker", html: renderToStaticMarkup(<MapPin size={19} aria-hidden="true" />), iconSize: [34, 34], iconAnchor: [17, 17] });
    const bounds = L.latLngBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]));
    points.forEach((point) => { L.marker([point.latitude, point.longitude], { icon, title: label }).addTo(map); });
    map.fitBounds(bounds, { maxZoom: 17, padding: [24, 24] });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); map.stop(); map.remove(); };
  }, [signature, label, locale]);
  return <div ref={element} className="check-in-location-map" role="region" aria-label={label} />;
}
