import { useEffect, useRef } from "react";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Building2 } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { EmergencyService } from "../data/emergencyServices";

export default function EmergencyServiceMap({ service }: { service: EmergencyService }) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elementRef.current) return;
    const map = L.map(elementRef.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tapHold: false })
      .setView([service.latitude, service.longitude], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([service.latitude, service.longitude], {
      icon: L.divIcon({ className: "police-help-marker", html: renderToStaticMarkup(<Building2 size={18} aria-hidden="true" />), iconSize: [32, 32], iconAnchor: [16, 16] }),
      title: service.name,
    }).addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(elementRef.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [service.id, service.name, service.latitude, service.longitude]);
  return <div className="police-help-map" ref={elementRef} role="region" aria-label={service.name} />;
}
