import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const accessSource = readFileSync(resolve(process.cwd(), "src/services/access.ts"), "utf8");
const destinationManagementSource = readFileSync(resolve(process.cwd(), "src/services/destinationManagement.ts"), "utf8");
const i18nSource = readFileSync(resolve(process.cwd(), "src/services/i18n.ts"), "utf8");
const mapSource = readFileSync(resolve(process.cwd(), "src/components/MapView.tsx"), "utf8");
const toastSource = readFileSync(resolve(process.cwd(), "src/components/ToastViewport.tsx"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

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
    expect(stylesSource).toContain("left: 10px");
  });

  it("keeps the tourist map simpler than the administrator analysis map", () => {
    expect(mapSource).toContain('mode?: "tourist" | "admin"');
    expect(mapSource).toContain("tourist-map-mode");
    expect(mapSource).toContain("destinations.slice");
  });

  it("keeps destination management searchable after CRUD stabilisation", () => {
    expect(appSource).toContain("Find destination");
    expect(appSource).toContain("categoryFilter");
    expect(appSource).toContain("filteredDestinations");
  });

  it("keeps supporting categories deliberate while primary AI categories stay clear", () => {
    expect(destinationManagementSource).toContain('["cultural", "nature", "urban", "heritage", "food", "coastal"]');
    expect(appSource).toContain("Cultural proportion");
    expect(appSource).toContain("Nature proportion");
    expect(appSource).toContain("Urban proportion");
    expect(appSource).toContain("Food");
    expect(appSource).toContain("Coastal");
  });

  it("keeps major failure paths connected to shared notifications", () => {
    expect(appSource).toContain("Login failed");
    expect(appSource).toContain("Registration failed");
    expect(appSource).toContain("Cloud save needs retry");
    expect(appSource).toContain("Location tracking stopped");
    expect(appSource).toContain("Destination not saved");
    expect(appSource).toContain("AI analysis refreshed");
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
});
