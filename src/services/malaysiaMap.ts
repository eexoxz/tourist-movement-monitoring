import type { Map as LeafletMap, MapOptions } from "leaflet";
import { projectMapCoordinate } from "./movementMapGeometry";

// Include the peninsula, Sabah, Sarawak, Labuan and Malaysia's coastal islands.
// The navigation envelope leaves room around the country for edge destinations.
export const malaysiaViewBounds: [[number, number], [number, number]] = [[0.75, 99.5], [7.6, 119.55]];
export const malaysiaNavigationBounds: [[number, number], [number, number]] = [[-0.5, 98], [9, 121.5]];
export const malaysiaMapOptions: MapOptions = {
  maxBounds: malaysiaNavigationBounds,
  maxBoundsViscosity: 1,
  minZoom: 4,
  maxZoom: 19,
  zoomSnap: 0.5,
  zoomDelta: 0.5,
  bounceAtZoomLimits: false,
};

export function minimumMalaysiaZoom(width: number, height: number) {
  if (width <= 0 || height <= 0) return 4;
  const [west, south] = projectMapCoordinate(...malaysiaViewBounds[0], 0);
  const [east, north] = projectMapCoordinate(...malaysiaViewBounds[1], 0);
  const scale = Math.min(Math.max(1, width - 32) / (east - west), Math.max(1, height - 32) / (south - north));
  return Math.max(3, Math.min(8, Math.floor(Math.log2(scale) * 2) / 2));
}

export function bindMalaysiaMapLimits(map: LeafletMap) {
  const refresh = () => {
    const size = map.getSize();
    map.setMinZoom(minimumMalaysiaZoom(size.x, size.y));
  };
  refresh();
  map.on("resize", refresh);
  return () => { map.off("resize", refresh); };
}
