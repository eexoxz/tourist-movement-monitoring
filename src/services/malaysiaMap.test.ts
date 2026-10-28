import { describe, expect, it, vi } from "vitest";
import type { Map as LeafletMap } from "leaflet";
import { bindMalaysiaMapLimits, malaysiaMapOptions, malaysiaNavigationBounds, malaysiaViewBounds, minimumMalaysiaZoom } from "./malaysiaMap";
import { projectMapCoordinate } from "./movementMapGeometry";

describe("Malaysia map navigation", () => {
  it("fits both Malaysian regions at the zoom-out limit on phone, tablet and desktop", () => {
    const southwest = projectMapCoordinate(...malaysiaViewBounds[0], 0);
    const northeast = projectMapCoordinate(...malaysiaViewBounds[1], 0);
    for (const [width, height] of [[280, 420], [390, 420], [768, 580], [1280, 580], [2000, 700]]) {
      const zoom = minimumMalaysiaZoom(width, height);
      expect((northeast[0] - southwest[0]) * 2 ** zoom).toBeLessThanOrEqual(width - 32);
      expect((southwest[1] - northeast[1]) * 2 ** zoom).toBeLessThanOrEqual(height - 32);
      expect(zoom).toBeGreaterThanOrEqual(3);
      expect(zoom % .5).toBe(0);
    }
    for (const [lat, lng] of [[6.45, 99.75], [1.36, 104.3], [5.28, 115.24], [1.6, 110.3], [7.3, 117.2], [4.45, 118.8]]) {
      expect(lat).toBeGreaterThanOrEqual(malaysiaNavigationBounds[0][0]); expect(lat).toBeLessThanOrEqual(malaysiaNavigationBounds[1][0]);
      expect(lng).toBeGreaterThanOrEqual(malaysiaNavigationBounds[0][1]); expect(lng).toBeLessThanOrEqual(malaysiaNavigationBounds[1][1]);
    }
    expect(malaysiaMapOptions).toMatchObject({ maxBoundsViscosity: 1, zoomSnap: .5, zoomDelta: .5, bounceAtZoomLimits: false, maxZoom: 19 });
  });

  it("recalculates the minimum in both resize directions and removes its listener", () => {
    let size = { x: 1280, y: 580 };
    const map = { getSize: () => size, setMinZoom: vi.fn(), on: vi.fn(), off: vi.fn() };
    const cleanup = bindMalaysiaMapLimits(map as unknown as LeafletMap);
    const refresh = map.on.mock.calls[0][1] as () => void;
    expect(map.setMinZoom).toHaveBeenLastCalledWith(minimumMalaysiaZoom(1280, 580));
    size = { x: 390, y: 420 }; refresh();
    expect(map.setMinZoom).toHaveBeenLastCalledWith(minimumMalaysiaZoom(390, 420));
    size = { x: 1280, y: 580 }; refresh();
    expect(map.setMinZoom).toHaveBeenLastCalledWith(minimumMalaysiaZoom(1280, 580));
    cleanup(); expect(map.off).toHaveBeenCalledWith("resize", refresh);
  });
});
