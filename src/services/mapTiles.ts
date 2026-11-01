import type { TileLayerOptions } from "leaflet";

export const mapTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Request only tiles needed by the current viewport. Start during a pan rather
// than waiting for its end; retain a small margin of already-viewed tiles.
export const mapTileOptions: TileLayerOptions = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  noWrap: true,
  updateWhenZooming: false,
  updateWhenIdle: false,
  updateInterval: 200,
  keepBuffer: 3,
};
