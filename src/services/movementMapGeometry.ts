import type { Destination, MovementPoint } from "../types";
import { distanceKm } from "./geo";
import { isContinuousMovementSegment } from "./movementQuality";

export function projectMapCoordinate(latitude: number, longitude: number, zoom: number): [number, number] {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [NaN, NaN];
  const size = 256 * 2 ** zoom;
  const sin = Math.sin(Math.max(-85.0511287798, Math.min(85.0511287798, latitude)) * Math.PI / 180);
  return [size * (longitude / 360 + .5), size * (.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI))];
}

export function canConnectMapPoints(previous: MovementPoint, point: MovementPoint) {
  return previous.tripId === point.tripId && previous.userId === point.userId
    && Date.parse(point.recordedAt) >= Date.parse(previous.recordedAt)
    && isContinuousMovementSegment(previous, point) && distanceKm(previous, point) <= 120;
}

export type MapProjection = { points: MovementPoint[]; zoom: number; xy: Float64Array };
export function projectMovementPoints(points: MovementPoint[], zoom: number, previous?: MapProjection): MapProjection {
  const appended = previous && previous.zoom === zoom && previous.points.length <= points.length && previous.points.every((point, index) => point === points[index]);
  if (appended && previous.points.length === points.length) return { ...previous, points };
  const xy = new Float64Array(points.length * 2);
  const start = appended ? previous.points.length : 0;
  if (appended) xy.set(previous.xy);
  for (let index = start; index < points.length; index++) {
    const point = points[index];
    const projected = projectMapCoordinate(point.latitude, point.longitude, zoom);
    xy[index * 2] = projected[0]; xy[index * 2 + 1] = projected[1];
  }
  return { points, zoom, xy };
}

export type DestinationMapGroup = { key: string; places: Destination[]; latitude: number; longitude: number };
export function groupMapDestinations(destinations: Destination[], zoom: number, cellPixels = 66): DestinationMapGroup[] {
  const cells = new Map<string, DestinationMapGroup>();
  for (const place of destinations) {
    const [x, y] = projectMapCoordinate(place.latitude, place.longitude, zoom);
    if (!Number.isFinite(x + y)) continue;
    const key = `${Math.floor(x / cellPixels)}:${Math.floor(y / cellPixels)}`;
    const group = cells.get(key);
    if (group) { group.places.push(place); group.latitude += place.latitude; group.longitude += place.longitude; }
    else cells.set(key, { key, places: [place], latitude: place.latitude, longitude: place.longitude });
  }
  return [...cells.values()].map((group) => ({ ...group, key: group.places.length === 1 ? group.places[0].id : `cluster:${zoom}:${group.key}`, latitude: group.latitude / group.places.length, longitude: group.longitude / group.places.length }));
}
