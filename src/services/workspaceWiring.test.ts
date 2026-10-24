import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const app = readSource("src/App.tsx");
const tourist = readSource("src/workspaces/TouristWorkspace.tsx");
const admin = readSource("src/workspaces/AdminWorkspace.tsx");
const map = readSource("src/components/MapView.tsx");
const home = readSource("src/components/TouristHome.tsx");
const trip = readSource("src/components/TripExperience.tsx");

// Focused suites test behaviour; these checks guard browser and map wiring they cannot mount.
describe("workspace integration guardrails", () => {
  it("paginates admin records and opens analysis details only on request", () => {
    expect(admin).not.toContain("?? analysisRows[0]");
    expect(admin).toContain('<PlaceGuideDialog title={adminText("ai.selectedResult")}');
    expect(admin.match(/<RecordPagination /g)).toHaveLength(2);
    expect(readSource("src/components/TouristDirectory.tsx")).toContain("<RecordPagination");
  });

  it("loads role workspaces lazily and prepares movement details only on the records tab", () => {
    expect(app).toContain('lazy(() => import("./workspaces/AdminWorkspace")');
    expect(app).toContain('lazy(() => import("./workspaces/TouristWorkspace")');
    for (const file of ["MapView", "EmergencyServiceMap", "CheckInLocationMap"]) {
      expect(readSource(`src/components/${file}.tsx`)).not.toContain("react-dom/server");
    }
    expect(admin).toContain('view === "dashboard" && adminTab === "records"');
    expect(admin).toContain("recordsActive ? getMovementDashboardViews");
    expect(admin).toContain("if (recordsActive && selectedRecordTripId");
    expect(admin).toContain("aiActive ? [...analyzeAllTrips(data)]");
    expect(admin).toContain("evaluateAiOutput(data, analysisRows)");
    expect(admin).toContain("touristsActive ? getTouristManagementRows(data) : []");
    expect(admin.match(/<DeferredDetails /g)).toHaveLength(5);
  });

  it("shows one map preview and hides it while a route-point popup is open", () => {
    expect(map).not.toContain("marker.bindPopup(");
    expect(map).toContain('on("popupopen", () => setRoutePopupOpen(true))');
    expect(map).toContain('on("popupclose", () => setRoutePopupOpen(false))');
    expect(map).toContain("!routePopupOpen && !previewDismissed");
    expect(map).toMatch(/const selectDestination = \(\) => \{\s*map.closePopup\(\)/);
  });

  it("requires an explicit action to expand details and lets tourists collapse or dismiss them", () => {
    expect(map).not.toContain("setSelectedDestinationId(visibleDestinations[0].id)");
    expect(map).toContain("detailsExpanded && selectedDestination && selectedSignal");
    expect(map).toContain("setExpandedDestinationId(previewDestination.id)");
    expect(map).toMatch(/const selectDestination = \(\) => \{[^}]*setExpandedDestinationId\(null\)/);
    expect(map).toContain("onClick={() => setExpandedDestinationId(null)}");
    expect(map).toContain("setDismissedPreviewId(previewDestination.id)");
  });

  it("advances the banner every eight seconds and finishes interrupted touch gestures", () => {
    const spotlight = readSource("src/components/HomeSpotlight.tsx");
    expect(spotlight).toContain("goTo(index + 1), 8000");
    expect(spotlight).toContain('window.addEventListener("pointerup", finishGesture)');
    expect(spotlight).toContain('window.addEventListener("pointercancel", finishGesture)');
    expect(spotlight).toContain("animateSpotlightMove(track.current");
    expect(spotlight).not.toContain("setPaused");
    expect(spotlight).not.toContain("setHovered");
  });

  it("matches canonical locations before translating their display labels", () => {
    expect(tourist).toContain("getRelevantTourismAdvisories({ destinations: data.destinations");
    expect(tourist).toMatch(/FestivalCalendarPanel[^>]+destinations=\{data.destinations\}/);
    expect(tourist).toContain("getDiscoveryDestinations(data.destinations, user, discoveryReference)");
    expect(tourist).toContain("localDestinationIds: discoveryReference ? canonicalDiscoveryDestinations.map");
    expect(readSource("src/components/FestivalCalendarPanel.tsx")).toContain("localizeDestinations(destinations, locale)");
  });

  it("refreshes calendar dates after midnight and when returning to the app", () => {
    const clock = readSource("src/services/useCalendarDay.ts");
    expect(clock).toContain('document.addEventListener("visibilitychange", refresh)');
    expect(clock).toContain('window.addEventListener("focus", refresh)');
    expect(tourist).toContain("[calendarDay]");
    expect(admin).toContain("[calendarDay]");
    expect(readSource("src/components/FestivalCalendarPanel.tsx")).toContain("current === previous.start ? today : current");
  });

  it("cleans up GPS watches and map motion when a workspace is removed", () => {
    expect(tourist).toContain("useEffect(() => () => clearBrowserLocationWatch(watchId), [user.id, watchId])");
    expect(map).toContain("mapRef.current?.stop()");
    expect(readSource("src/components/EmergencyServiceMap.tsx")).toContain("observer.disconnect(); map.stop(); map.remove()");
  });

  it("uses the current discovery fix rather than historical routes for safety and nearest check-in", () => {
    expect(tourist).toContain("nearestCheckIn.distance <= 1.2");
    expect(tourist).toContain("discoveryGpsPoint ? nearestDestination(discoveryGpsPoint");
    expect(tourist).toContain("getNearbyEmergencyServices(discoveryGpsPoint)");
    expect(tourist).toContain("createSosAlert(loadData(), user.id, discoveryGpsPoint)");
    expect(tourist).not.toContain("location: latestKnownPoint");
  });

  it("connects browser alerts to localized notifications and the in-app toast fallback", () => {
    const sources = `${app}\n${tourist}\n${admin}`;
    expect(sources).toContain("showBrowserNotification({ ...notification");
    expect(sources).toContain("title: uiText(locale, notification.title)");
    expect(sources).toContain('t("notifications.enableAction")');
    expect(readSource("src/components/ToastViewport.tsx")).toContain('aria-live="polite"');
  });

  it("connects QR camera scanning and the manual code fallback to check-in", () => {
    const scanner = readSource("src/components/QrCheckInPanel.tsx");
    expect(scanner).toContain("BarcodeDetector");
    expect(scanner).toContain("getUserMedia");
    expect(scanner).toContain('t("tourist.checkin.useCode")');
    expect(home).toContain("QrCheckInPanel");
    expect(tourist).toContain("destinationIdOverride");
  });

  it("connects compressed photo evidence to incident submission", () => {
    const attachments = readSource("src/services/incidentAttachments.ts");
    expect(attachments).toContain("FileReader");
    expect(attachments).toContain("canvas.toDataURL");
    expect(tourist).toContain("prepareIncidentPhotoAttachment");
    expect(home).toContain("incidentPhoto");
    expect(tourist).toContain("photoDataUrl");
  });

  it("keeps aggregate demand separate from individual trip routes", () => {
    expect(map).toContain('displayMode === "route" && route.length > 0');
    expect(map).toContain('displayMode === "signals"');
    expect(map).toContain("splitRouteSegments");
    expect(map).toContain("maxRenderedRoutePointMarkers");
    expect(admin).toContain('displayMode="signals"');
    expect(trip).toContain('displayMode={activeTrip ? "route" : "signals"}');
    expect(admin).toContain('displayMode={selectedRecord?.points.length ? "route" : "signals"}');
    expect(readSource("src/components/TripDiary.tsx")).toContain('displayMode={selectedTripPoints.length ? "route" : "signals"}');
  });

  it("isolates Leaflet layers so maps cannot cover mobile navigation or dialogs", () => {
    const imports = [...readSource("src/styles.css").matchAll(/@import "\.\/(.+?)";/g)];
    const styles = imports.map(([, file]) => readSource(`src/${file}`)).join("\n");
    expect(styles).toMatch(/\.map-frame\s*\{[^}]*isolation:\s*isolate/);
    expect(styles).toContain(".map-detail-panel:not(.visible)");
  });

  it("keeps bulk demo actions local-only and disabled while running", () => {
    expect(admin).toContain("DEMO_DATASET_LOCAL_ONLY_STATUS");
    expect(admin).toContain("onDataChange(next, null, { localOnlyStatus: DEMO_DATASET_LOCAL_ONLY_STATUS })");
    expect(app).toMatch(/if \(options\.localOnlyStatus\) \{\s*cacheLocalData\(nextData\);\s*setSyncStatus\(options\.localOnlyStatus\);\s*return;/);
    expect(admin).toContain("DemoDatasetManager");
    expect(readSource("src/components/DemoDatasetManager.tsx")).toContain("!preview.touristCount || unchanged");
    expect(admin).toContain('disabled={Boolean(demoDatasetAction)}');
  });
});
