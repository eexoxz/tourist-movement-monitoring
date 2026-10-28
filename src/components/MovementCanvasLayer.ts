import L from "leaflet";
import type { MovementPoint } from "../types";
import { canConnectMapPoints, projectMovementPoints, type MapProjection } from "../services/movementMapGeometry";

// One drawing surface and one click listener, regardless of record count. The map pane
// moves this canvas during a drag; geometry is refreshed after the gesture finishes.
export class MovementCanvasLayer extends L.Layer {
  private canvas?: HTMLCanvasElement;
  private ownerMap?: L.Map;
  private frame?: number;
  private projection?: MapProjection;
  private points: MovementPoint[] = [];
  private connections = new Uint8Array();
  private routes = false;
  private hitCells = new Map<string, number[]>();
  private worldOrigin = L.point(0, 0);
  private selectedId?: string;
  onSelect?: (point: MovementPoint, index: number) => void;

  onAdd(map: L.Map): this {
    this.ownerMap = map;
    this.canvas = L.DomUtil.create("canvas", "movement-point-canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.style.pointerEvents = "none";
    map.getPane("overlayPane")!.appendChild(this.canvas);
    this.redraw();
    return this;
  }

  onRemove(): this {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.canvas?.remove(); this.canvas = undefined;
    this.ownerMap = undefined; this.hitCells.clear(); this.projection = undefined;
    return this;
  }

  getEvents() { return { moveend: this.redraw, zoom: this.redraw, resize: this.redraw, click: (event: L.LeafletEvent) => this.selectPoint(event as L.LeafletMouseEvent) }; }

  setData(points: MovementPoint[], routes: boolean) {
    if (points !== this.points) {
      const appended = this.points.length <= points.length && this.points.every((point, index) => point === points[index]);
      const connections = new Uint8Array(points.length);
      if (appended) connections.set(this.connections);
      for (let i = appended ? Math.max(1, this.points.length) : 1; i < points.length; i++) connections[i] = Number(canConnectMapPoints(points[i - 1], points[i]));
      this.connections = connections; this.points = points;
    }
    this.routes = routes;
    this.redraw();
    return this;
  }

  redraw = () => {
    if (this.frame !== undefined || !this.ownerMap) return;
    this.frame = requestAnimationFrame(() => { this.frame = undefined; this.draw(); });
  };

  private draw() {
    const map = this.ownerMap, canvas = this.canvas;
    if (!map || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const size = map.getSize(), padding = 120, width = size.x + padding * 2, height = size.y + padding * 2;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const topLeft = map.containerPointToLayerPoint(L.point(-padding, -padding));
    L.DomUtil.setPosition(canvas, topLeft);
    this.worldOrigin = map.getPixelOrigin().add(topLeft);
    this.projection = projectMovementPoints(this.points, map.getZoom(), this.projection);
    const xy = this.projection.xy, origin = this.worldOrigin;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.hitCells.clear();
    if (this.routes) {
      context.beginPath();
      const paintedEdges = new Set<string>();
      for (let i = 1; i < this.points.length; i++) {
        if (!this.connections[i]) continue;
        const x0 = xy[(i - 1) * 2] - origin.x, y0 = xy[(i - 1) * 2 + 1] - origin.y;
        const x1 = xy[i * 2] - origin.x, y1 = xy[i * 2 + 1] - origin.y;
        if (!Number.isFinite(x0 + y0 + x1 + y1) || Math.max(x0, x1) < 0 || Math.min(x0, x1) > width || Math.max(y0, y1) < 0 || Math.min(y0, y1) > height) continue;
        const from = `${Math.round(x0 * ratio)},${Math.round(y0 * ratio)}`, to = `${Math.round(x1 * ratio)},${Math.round(y1 * ratio)}`;
        const key = from < to ? `${from}:${to}` : `${to}:${from}`;
        if (from === to || paintedEdges.has(key)) continue;
        paintedEdges.add(key);
        context.moveTo(x0, y0); context.lineTo(x1, y1);
      }
      context.lineJoin = "round"; context.lineCap = "round";
      context.strokeStyle = "rgba(255,255,255,.9)"; context.lineWidth = 6; context.stroke();
      context.strokeStyle = "rgba(15,118,110,.8)"; context.lineWidth = 3; context.stroke();
    }
    const radius = map.getZoom() < 9 ? 2 : 3;
    let visible = 0, painted = 0;
    for (const source of ["demo", "browser"] as const) {
      context.beginPath();
      const paintedPixels = new Set<number>();
      for (let i = 0; i < this.points.length; i++) {
        if ((this.points[i].source === "demo" ? "demo" : "browser") !== source) continue;
        const x = xy[i * 2] - origin.x, y = xy[i * 2 + 1] - origin.y;
        if (!Number.isFinite(x + y) || x < 0 || y < 0 || x > width || y > height) continue;
        // Coincident sub-pixel dots look identical. Paint one shape at that pixel,
        // while retaining every record below for counts and hit-testing.
        const pixel = Math.round(y * ratio) * (Math.ceil(width * ratio) + 1) + Math.round(x * ratio);
        if (!paintedPixels.has(pixel)) {
          paintedPixels.add(pixel); painted++;
          context.moveTo(x + radius, y); context.arc(x, y, radius, 0, Math.PI * 2);
        }
        const key = `${Math.floor(x / 24)}:${Math.floor(y / 24)}`, cell = this.hitCells.get(key);
        if (cell) cell.push(i); else this.hitCells.set(key, [i]);
        visible++;
      }
      context.fillStyle = source === "demo" ? "rgba(180,83,9,.55)" : "rgba(13,148,136,.8)";
      context.fill();
    }
    if (this.selectedId) {
      const index = this.points.findIndex((point) => point.id === this.selectedId);
      if (index >= 0) {
        context.beginPath(); context.arc(xy[index * 2] - origin.x, xy[index * 2 + 1] - origin.y, 7, 0, Math.PI * 2);
        context.strokeStyle = "#be123c"; context.lineWidth = 2; context.stroke();
      }
    }
    // Counts permit an accessible UI and regression checks without exposing location data.
    canvas.dataset.loadedPoints = String(this.points.length);
    canvas.dataset.drawnPoints = String(visible);
    canvas.dataset.paintedDots = String(painted);
  }

  private selectPoint = (event: L.LeafletMouseEvent) => {
    if (!this.ownerMap || !this.projection) return;
    const pixel = this.ownerMap.project(event.latlng, this.ownerMap.getZoom()).subtract(this.worldOrigin);
    const cellX = Math.floor(pixel.x / 24), cellY = Math.floor(pixel.y / 24);
    let best = -1, bestDistance = 81;
    for (let x = cellX - 1; x <= cellX + 1; x++) for (let y = cellY - 1; y <= cellY + 1; y++) {
      for (const index of this.hitCells.get(`${x}:${y}`) ?? []) {
        const dx = this.projection.xy[index * 2] - this.worldOrigin.x - pixel.x, dy = this.projection.xy[index * 2 + 1] - this.worldOrigin.y - pixel.y;
        const distance = dx * dx + dy * dy;
        if (distance <= bestDistance) { bestDistance = distance; best = index; }
      }
    }
    if (best >= 0) { this.selectedId = this.points[best].id; this.onSelect?.(this.points[best], best); this.redraw(); }
  };
}
