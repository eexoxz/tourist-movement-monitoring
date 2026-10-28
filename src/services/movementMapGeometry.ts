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
export const destinationGroupSpacing = 56;

// Neighbouring grid cells can have centroids on the same edge. Merge touching
// groups until their actual screen positions leave room for a 44px circle/halo.
function separateDestinationGroups(initial: DestinationMapGroup[], zoom: number) {
  let groups = initial;
  while (groups.length > 1) {
    const parents = groups.map((_, index) => index);
    const root = (index: number): number => {
      while (parents[index] !== index) { parents[index] = parents[parents[index]]; index = parents[index]; }
      return index;
    };
    const cells = new Map<string, Array<{ index: number; x: number; y: number }>>();
    let merged = false;
    groups.forEach((group, index) => {
      const [x, y] = projectMapCoordinate(group.latitude, group.longitude, zoom);
      const cellX = Math.floor(x / destinationGroupSpacing), cellY = Math.floor(y / destinationGroupSpacing);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const other of cells.get(`${cellX + dx}:${cellY + dy}`) ?? []) {
          if ((x - other.x) ** 2 + (y - other.y) ** 2 >= destinationGroupSpacing ** 2) continue;
          const a = root(index), b = root(other.index);
          if (a !== b) { parents[b] = a; merged = true; }
        }
      }
      const key = `${cellX}:${cellY}`, cell = cells.get(key) ?? [];
      cell.push({ index, x, y }); cells.set(key, cell);
    });
    if (!merged) break;
    const combined = new Map<number, DestinationMapGroup>();
    groups.forEach((group, index) => {
      const key = root(index), previous = combined.get(key), count = group.places.length;
      if (!previous) combined.set(key, { ...group, places: [...group.places], latitude: group.latitude * count, longitude: group.longitude * count });
      else {
        previous.places.push(...group.places);
        previous.latitude += group.latitude * count; previous.longitude += group.longitude * count;
        if (group.key < previous.key) previous.key = group.key;
      }
    });
    groups = [...combined.values()].map((group) => ({ ...group, latitude: group.latitude / group.places.length, longitude: group.longitude / group.places.length }));
  }
  return groups;
}

export function groupMapDestinations(destinations: Destination[], zoom: number, cellPixels = 66): DestinationMapGroup[] {
  const cells = new Map<string, DestinationMapGroup>();
  for (const place of destinations) {
    const [x, y] = projectMapCoordinate(place.latitude, place.longitude, zoom);
    if (!Number.isFinite(x + y)) continue;
    const region = place.longitude < 106 ? "peninsula" : "borneo";
    const key = `${region}:${Math.floor(x / cellPixels)}:${Math.floor(y / cellPixels)}`;
    const group = cells.get(key);
    if (group) { group.places.push(place); group.latitude += place.latitude; group.longitude += place.longitude; }
    else cells.set(key, { key, places: [place], latitude: place.latitude, longitude: place.longitude });
  }
  const normalized = [...cells.values()].map((group) => ({ ...group, latitude: group.latitude / group.places.length, longitude: group.longitude / group.places.length }));
  // Do not combine the two land regions into an offshore centroid at phone zoom.
  const groups = ["peninsula:", "borneo:"].flatMap((region) => separateDestinationGroups(normalized.filter((group) => group.key.startsWith(region)), zoom));
  return groups.map((group) => ({ ...group, key: group.places.length === 1 ? group.places[0].id : `cluster:${zoom}:${group.key}` }));
}
