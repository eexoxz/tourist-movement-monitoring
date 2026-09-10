import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const accessSource = readFileSync(resolve(process.cwd(), "src/services/access.ts"), "utf8");
const adminAnalyticsSource = readFileSync(resolve(process.cwd(), "src/components/AdminAnalyticsWidgets.tsx"), "utf8");
const adminI18nSource = readFileSync(resolve(process.cwd(), "src/services/adminI18n.ts"), "utf8");
const authScreenSource = readFileSync(resolve(process.cwd(), "src/components/AuthScreen.tsx"), "utf8");
const destinationManagerSource = readFileSync(resolve(process.cwd(), "src/components/DestinationManager.tsx"), "utf8");
const destinationManagementSource = readFileSync(resolve(process.cwd(), "src/services/destinationManagement.ts"), "utf8");
const i18nSource = readFileSync(resolve(process.cwd(), "src/services/i18n.ts"), "utf8");
const listLimitFooterSource = readFileSync(resolve(process.cwd(), "src/components/ListLimitFooter.tsx"), "utf8");
const mapSource = readFileSync(resolve(process.cwd(), "src/components/MapView.tsx"), "utf8");
const movementMapSource = readFileSync(resolve(process.cwd(), "src/components/MovementMap.tsx"), "utf8");
const touristHomeSource = readFileSync(resolve(process.cwd(), "src/components/TouristHome.tsx"), "utf8");
const toastSource = readFileSync(resolve(process.cwd(), "src/components/ToastViewport.tsx"), "utf8");
const tripDiarySource = readFileSync(resolve(process.cwd(), "src/components/TripDiary.tsx"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const viteConfigSource = readFileSync(resolve(process.cwd(), "vite.config.js"), "utf8");

describe("user interface quality guardrails", () => {
  it("keeps mobile tourist pages protected from horizontal scrolling", () => {
    expect(stylesSource).toContain("overflow-x: hidden");
    expect(stylesSource).toContain("@media (max-width: 760px)");
    expect(stylesSource).toContain(".tourist-shell .content");
    expect(stylesSource).toContain(".tourist-shell .nav-list");
    expect(stylesSource).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    expect(stylesSource).toContain("height: 58vh");
  });

  it("keeps recoverable failures connected to visible retry and toast patterns", () => {
    expect(appSource).toContain("Try location again");
    expect(i18nSource).toContain('"sync.retry": "Retry sync"');
    expect(toastSource).toContain("toast-stack");
  });

  it("keeps toast placement usable on tourist mobile and administrator desktop layouts", () => {
    expect(stylesSource).toContain(".toast-stack");
    expect(stylesSource).toContain(".tourist-shell .toast-stack");
    expect(toastSource).toContain('aria-live="polite"');
    expect(stylesSource).toContain("width: min(380px, calc(100vw - 28px))");
    expect(stylesSource).toContain("z-index: 50000");
    expect(stylesSource).toContain("left: 10px");
  });

  it("keeps the tourist map simpler than the administrator analysis map", () => {
    expect(mapSource).toContain('mode?: "tourist" | "admin"');
    expect(mapSource).toContain("tourist-map-mode");
    expect(mapSource).toContain("rankedDestinations.slice");
  });

  it("keeps destination management searchable after CRUD stabilisation", () => {
    expect(destinationManagerSource).toContain("Find destination");
    expect(destinationManagerSource).toContain("categoryFilter");
    expect(destinationManagerSource).toContain("filteredDestinations");
  });

  it("keeps supporting categories deliberate while primary AI categories stay clear", () => {
    expect(destinationManagementSource).toContain('["cultural", "nature", "urban", "heritage", "food", "coastal"]');
    expect(adminAnalyticsSource).toContain("Cultural proportion");
    expect(adminAnalyticsSource).toContain("Nature proportion");
    expect(adminAnalyticsSource).toContain("Urban proportion");
    expect(i18nSource).toContain('"category.food": "Food"');
    expect(i18nSource).toContain('"category.coastal": "Coastal"');
  });

  it("keeps major failure paths connected to shared notifications", () => {
    expect(authScreenSource).toContain("Login failed");
    expect(authScreenSource).toContain("Registration failed");
    expect(appSource).toContain("Cloud save needs retry");
    expect(appSource).toContain("Location tracking stopped");
    expect(destinationManagerSource).toContain("Destination not saved");
    expect(adminI18nSource).toContain("AI analysis refreshed");
  });

  it("keeps the final navigation focused on the seven-page FYP scope", () => {
    expect(accessSource).toContain('"/app/home"');
    expect(accessSource).toContain('"/app/trips"');
    expect(accessSource).toContain('"/app/recommendations"');
    expect(accessSource).toContain('"/admin/dashboard"');
    expect(accessSource).toContain('"/admin/destinations"');
  });

  it("keeps commercial tourism platform features out of the prototype UI", () => {
    const combinedSource = `${appSource}\n${accessSource}`.toLowerCase();

    expect(combinedSource).not.toContain("book hotel");
    expect(combinedSource).not.toContain("flight");
    expect(combinedSource).not.toContain("payment");
    expect(combinedSource).not.toContain("review stars");
    expect(combinedSource).not.toContain("chatbot");
  });

  it("keeps large internal modules split out of the main production app chunk", () => {
    expect(viteConfigSource).toContain("locale-copy");
    expect(viteConfigSource).toContain("tourism-data");
    expect(viteConfigSource).toContain("analysis-core");
    expect(viteConfigSource).toContain("normalizedId");
  });

  it("keeps reusable list limiting UI outside the main app shell", () => {
    expect(appSource).toContain('from "./components/ListLimitFooter"');
    expect(appSource).not.toContain("function ListLimitFooter");
    expect(listLimitFooterSource).toContain("export function ListLimitFooter");
  });

  it("keeps large dashboard maps from drawing every movement point as one route", () => {
    expect(movementMapSource).toContain('displayMode?: "route" | "signals"');
    expect(mapSource).toContain('displayMode === "route" && route.length > 0');
    expect(mapSource).toContain('displayMode === "signals"');
    expect(mapSource).toContain('"999+"');
    expect(appSource).toContain('displayMode="signals"');
    expect(appSource).toContain('displayMode={activePoints.length ? "route" : "signals"}');
    expect(appSource).toContain('displayMode={selectedRecord?.points.length ? "route" : "signals"}');
    expect(touristHomeSource).toContain('displayMode={activeTrip ? "route" : "signals"}');
    expect(tripDiarySource).toContain('displayMode={selectedTripPoints.length ? "route" : "signals"}');
  });

  it("keeps aggregate map rendering focused on useful demand signals", () => {
    expect(mapSource).toContain("shouldDrawDemandHalo");
    expect(mapSource).toContain("markerZIndex");
    expect(mapSource).toContain("signalBoundDestinations");
    expect(mapSource).toContain("signal.nearbyPointCount > 0");
  });

  it("keeps large prepared demo dataset actions local-only and hard to spam", () => {
    expect(appSource).toContain('const [demoDatasetAction, setDemoDatasetAction]');
    expect(appSource).toContain("DEMO_DATASET_LOCAL_ONLY_STATUS");
    expect(appSource).toContain("cacheLocalData(nextData)");
    expect(appSource).toContain('disabled={Boolean(demoDatasetAction) || demoDatasetLoaded}');
    expect(appSource).toContain('disabled={Boolean(demoDatasetAction)}');
    expect(i18nSource).toContain('"admin.demo.localOnlyNote"');
    expect(stylesSource).toContain(".demo-sync-note");
  });
});
