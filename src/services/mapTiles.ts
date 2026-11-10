import type { TileLayerOptions } from "leaflet";

export const mapTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const mapTileOptions: TileLayerOptions = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  noWrap: true,
  updateWhenZooming: false,
  updateWhenIdle: false,
  updateInterval: 200,
  keepBuffer: 3,
};
