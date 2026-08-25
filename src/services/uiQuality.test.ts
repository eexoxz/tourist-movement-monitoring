import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");
const accessSource = readFileSync(resolve(process.cwd(), "src/services/access.ts"), "utf8");
const mapSource = readFileSync(resolve(process.cwd(), "src/components/MapView.tsx"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("user interface quality guardrails", () => {
  it("keeps mobile tourist pages protected from horizontal scrolling", () => {
    expect(stylesSource).toContain("overflow-x: hidden");
    expect(stylesSource).toContain("@media (max-width: 760px)");
    expect(stylesSource).toContain(".tourist-shell .content");
  });

  it("keeps recoverable failures connected to visible retry and toast patterns", () => {
    expect(appSource).toContain("Try location again");
    expect(appSource).toContain("Retry sync");
    expect(appSource).toContain("toast-stack");
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
