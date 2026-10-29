import L from "leaflet";
import type { Locale } from "./i18n";
import { tripLayoutText } from "./tripLayoutCopy";

// Use the same keyboard-accessible control on the movement and small location maps.
export function addMapResetControl(map: L.Map, locale: Locale, reset: () => void) {
  const control = new L.Control({ position: "bottomright" });
  control.onAdd = () => {
    const container = L.DomUtil.create("div", "leaflet-bar map-reset-control");
    const button = L.DomUtil.create("button", "", container);
    button.type = "button";
    button.title = tripLayoutText(locale, "resetView");
    button.setAttribute("aria-label", button.title);
    button.textContent = "↺";
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    button.addEventListener("click", () => { map.stop(); reset(); });
    return container;
  };
  control.addTo(map);
  return () => { control.remove(); };
}
