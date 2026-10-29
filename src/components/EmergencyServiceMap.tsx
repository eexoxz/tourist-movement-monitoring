import { useEffect, useRef } from "react";
import L from "leaflet";
import { addMapResetControl } from "../services/mapResetControl";
import { uiText } from "../services/uiText";
import type { Locale } from "../services/i18n";
import { emergencyIconMarkup } from "../generated/mapIconMarkup";
import "leaflet/dist/leaflet.css";
import type { EmergencyService } from "../data/emergencyServices";
import { bindMalaysiaMapLimits, malaysiaMapOptions } from "../services/malaysiaMap";

export default function EmergencyServiceMap({ service, locale = "en" }: { service: EmergencyService; locale?: Locale }) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elementRef.current) return;
    const map = L.map(elementRef.current, { ...malaysiaMapOptions, zoomControl: false, zoomAnimation: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, tapHold: false })
      .setView([service.latitude, service.longitude], 16);
    const releaseLimits = bindMalaysiaMapLimits(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    for (const [selector, source] of [[".leaflet-control-zoom-in", "Zoom in"], [".leaflet-control-zoom-out", "Zoom out"]]) {
      const button = elementRef.current.querySelector<HTMLElement>(selector);
      button?.setAttribute("title", uiText(locale, source)); button?.setAttribute("aria-label", uiText(locale, source));
    }
    const removeReset = addMapResetControl(map, locale, () => map.setView([service.latitude, service.longitude], 16, { animate: false }));
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      noWrap: true,
    }).addTo(map);
    L.marker([service.latitude, service.longitude], {
      icon: L.divIcon({ className: "police-help-marker", html: emergencyIconMarkup, iconSize: [32, 32], iconAnchor: [16, 16] }),
      title: service.name,
    }).addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(elementRef.current);
    return () => { observer.disconnect(); removeReset(); releaseLimits(); map.stop(); map.remove(); };
  }, [service.id, service.name, service.latitude, service.longitude, locale]);
  return <div className="police-help-map" ref={elementRef} role="region" aria-label={service.name} />;
}
